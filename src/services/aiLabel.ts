export function suggestTaskLabel(textHint?: string): {
  title: string;
  category: string;
} {
  if (!textHint) {
    return { title: "New Task", category: "General" };
  }

  const t = textHint.toLowerCase().trim();

  // Household
  if (t.includes("dish") || t.includes("dishes") || t.includes("sink"))
    return { title: "Wash the Dishes", category: "Personal" };
  if (t.includes("laundry") || t.includes("clothes") || t.includes("washing"))
    return { title: "Do Laundry", category: "Personal" };
  if (t.includes("vacuum") || t.includes("mop") || t.includes("clean") || t.includes("sweep"))
    return { title: "Clean the House", category: "Personal" };
  if (t.includes("trash") || t.includes("garbage") || t.includes("rubbish"))
    return { title: "Take Out Trash", category: "Personal" };
  if (t.includes("iron") || t.includes("ironing"))
    return { title: "Iron Clothes", category: "Personal" };
  if (t.includes("cook") || t.includes("meal") || t.includes("food") || t.includes("dinner"))
    return { title: "Prepare Meal", category: "Personal" };

  // Academic
  if (t.includes("study") || t.includes("exam") || t.includes("test"))
    return { title: "Study Session", category: "Academic" };
  if (t.includes("homework") || t.includes("assignment"))
    return { title: "Complete Assignment", category: "Academic" };
  if (t.includes("read") || t.includes("book") || t.includes("notes"))
    return { title: "Review Notes", category: "Academic" };

  // Health
  if (t.includes("gym") || t.includes("workout") || t.includes("exercise"))
    return { title: "Gym Workout", category: "Health" };
  if (t.includes("run") || t.includes("jog"))
    return { title: "Go For A Run", category: "Health" };
  if (t.includes("medicine") || t.includes("pill") || t.includes("doctor"))
    return { title: "Take Medication", category: "Health" };

  // Finance
  if (t.includes("bill") || t.includes("payment") || t.includes("receipt") || t.includes("invoice"))
    return { title: "Review Receipt", category: "Finance" };
  if (t.includes("budget") || t.includes("expense"))
    return { title: "Update Budget", category: "Finance" };

  // Work
  if (t.includes("meeting") || t.includes("call"))
    return { title: "Attend Meeting", category: "Work" };
  if (t.includes("email") || t.includes("reply"))
    return { title: "Reply To Emails", category: "Work" };
  if (t.includes("project") || t.includes("deadline"))
    return { title: "Finish Project", category: "Work" };

  // Personal errands
  if (t.includes("shop") || t.includes("grocery") || t.includes("market"))
    return { title: "Go Grocery Shopping", category: "Personal" };
  if (t.includes("car") || t.includes("gas") || t.includes("fuel"))
    return { title: "Car Maintenance", category: "Personal" };
  if (t.includes("plant") || t.includes("water") || t.includes("garden"))
    return { title: "Water The Plants", category: "Personal" };
  if (t.includes("pet") || t.includes("dog") || t.includes("cat") || t.includes("feed"))
    return { title: "Feed The Pet", category: "Personal" };
  if (t.includes("package") || t.includes("mail") || t.includes("delivery"))
    return { title: "Pick Up Package", category: "Personal" };

  return { title: textHint, category: "General" };
}
