import { collection, doc, getDocs, getDoc, setDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { db as firestoreDb } from "./firebase";
import { Task } from "../core/types/task";
import { auth } from "./firebase";

// Collection name for tasks
const TASKS_COLLECTION = "tasks";

export async function initDb() {
  // Firebase doesn't need explicit initialization like SQLite
  // Firestore handles schema automatically
  console.log("Firebase database initialized");
}

export async function getAllTasks(): Promise<Task[]> {
  console.log('🔐 Checking authentication for getAllTasks...');
  if (!auth.currentUser) {
    console.error('❌ No authenticated user found for getAllTasks');
    throw new Error("User must be authenticated to access tasks");
  }

  console.log('👤 Getting tasks for user:', auth.currentUser.uid);

  try {
    const tasksRef = collection(firestoreDb, TASKS_COLLECTION);
    // Remove orderBy to avoid requiring composite index - we'll sort in JS
    const q = query(
      tasksRef,
      where("userId", "==", auth.currentUser.uid)
    );

    console.log('🔍 Executing Firestore query...');
    const querySnapshot = await getDocs(q);
    const tasks: Task[] = [];

    console.log('📋 Processing query results...');
    querySnapshot.forEach((doc) => {
      const taskData = doc.data() as Task;
      console.log('📄 Retrieved task:', {
        id: taskData.id,
        title: taskData.title,
        hasImageUri: !!taskData.imageUri,
        hasImageBase64: !!taskData.imageBase64,
        imageBase64Length: taskData.imageBase64?.length
      });
      tasks.push(taskData);
    });

    // Sort tasks by updatedAt in descending order (most recent first)
    tasks.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    console.log(`✅ Retrieved ${tasks.length} tasks from Firestore`);
    return tasks;
  } catch (error) {
    console.error("❌ Failed to get all tasks:", error);
    throw error;
  }
}

export async function getTaskById(id: string): Promise<Task | null> {
  if (!auth.currentUser) {
    throw new Error("User must be authenticated to access tasks");
  }

  try {
    const taskRef = doc(firestoreDb, TASKS_COLLECTION, id);
    const taskSnap = await getDoc(taskRef);

    if (taskSnap.exists()) {
      const taskData = taskSnap.data() as Task;
      // Verify the task belongs to the current user
      if (taskData.userId === auth.currentUser.uid) {
        return taskData;
      }
    }

    return null;
  } catch (error) {
    console.error("Failed to get task by ID:", error);
    throw error;
  }
}

export async function upsertTask(task: Task): Promise<void> {
  console.log('🔐 Checking authentication...');
  if (!auth.currentUser) {
    console.error('❌ No authenticated user found');
    throw new Error("User must be authenticated to save tasks");
  }

  console.log('👤 Authenticated user:', auth.currentUser.uid);

  try {
    let taskData = { ...task };

    // Handle local image storage (no Firebase Storage upload needed)
    if (task.imageUri && task.imageBase64) {
      console.log('🖼️ Task has local image, keeping imageUri for local storage...');
      // Keep imageUri for local storage, remove imageBase64 as it's not needed
      taskData = {
        ...task,
      };
      // Remove imageBase64 from the final data since we're using local storage
      delete (taskData as any).imageBase64;
      console.log('✅ Using local image storage (no cloud upload needed)');
    }

    // Add userId to the task for security
    const taskWithUserId = {
      ...taskData,
      userId: auth.currentUser.uid,
    };

    console.log('📦 Final task data to store:', {
      id: taskWithUserId.id,
      title: taskWithUserId.title,
      hasImageUri: !!taskWithUserId.imageUri,
      hasImageUrl: !!taskWithUserId.imageUrl,
      userId: taskWithUserId.userId
    });

    console.log('💾 Storing task in Firestore...');
    const taskRef = doc(firestoreDb, TASKS_COLLECTION, task.id);
    await setDoc(taskRef, taskWithUserId);
    console.log('✅ Task stored successfully in Firestore');
  } catch (error) {
    console.error("❌ Failed to upsert task:", error);
    throw error;
  }
}

export async function deleteTask(id: string): Promise<void> {
  if (!auth.currentUser) {
    throw new Error("User must be authenticated to delete tasks");
  }

  try {
    // First verify the task belongs to the current user
    const task = await getTaskById(id);
    if (!task) {
      throw new Error("Task not found");
    }

    const taskRef = doc(firestoreDb, TASKS_COLLECTION, id);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error("Failed to delete task:", error);
    throw error;
  }
}
