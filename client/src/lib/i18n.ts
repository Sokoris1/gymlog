export type Lang = "ru" | "en";

export const translations = {
  // ─── Login ────────────────────────────────────────────────────────────────
  login: {
    subtitle:     { ru: "Ваш дневник тренировок", en: "Your training diary" },
    placeholder:  { ru: "Введите имя пользователя", en: "Enter username" },
    continue:     { ru: "Продолжить", en: "Continue" },
    loading:      { ru: "Вход...", en: "Logging in..." },
    orTryDemo:    { ru: "или войдите демо", en: "or try demo" },
    demoAlex:     { ru: "Алекс (Демо)", en: "Alex (Demo)" },
    demomaria:    { ru: "Мария (Демо)", en: "Maria (Demo)" },
    loginFailed:  { ru: "Ошибка входа", en: "Login failed" },
  },

  // ─── Bottom Nav ───────────────────────────────────────────────────────────
  nav: {
    home:     { ru: "Главная", en: "Home" },
    workout:  { ru: "Тренировка", en: "Workout" },
    calendar: { ru: "Календарь", en: "Calendar" },
    friends:  { ru: "Друзья", en: "Friends" },
    profile:  { ru: "Профиль", en: "Profile" },
  },

  // ─── Home ─────────────────────────────────────────────────────────────────
  home: {
    greetMorning:   { ru: "Доброе утро", en: "Good morning" },
    greetAfternoon: { ru: "Добрый день", en: "Good afternoon" },
    greetEvening:   { ru: "Добрый вечер", en: "Good evening" },
    startWorkout:   { ru: "Начать тренировку", en: "Start Workout" },
    startSub:       { ru: "Новая или по шаблону", en: "New session or from template" },
    workouts:       { ru: "Тренировки", en: "Workouts" },
    volume:         { ru: "Объём (кг)", en: "Volume (kg)" },
    records:        { ru: "Рекорды", en: "Records" },
    recentWorkouts: { ru: "Последние тренировки", en: "Recent Workouts" },
    seeAll:         { ru: "Все", en: "See all" },
    noWorkouts:     { ru: "Тренировок пока нет. Начните первую!", en: "No workouts yet. Start your first!" },
    recentPRs:      { ru: "Последние рекорды", en: "Recent PRs" },
    exercises:      { ru: "Упражнения", en: "Exercises" },
    progress:       { ru: "Прогресс", en: "Progress" },
  },

  // ─── Workout (diary) ─────────────────────────────────────────────────────
  workout: {
    title:          { ru: "Дневник тренировок", en: "Training Diary" },
    newBtn:         { ru: "Новая", en: "New" },
    blankWorkout:   { ru: "Пустая тренировка", en: "Blank Workout" },
    blankSub:       { ru: "Начать с нуля", en: "Start fresh" },
    fromTemplate:   { ru: "По шаблону", en: "From Template" },
    available:      { ru: "доступно", en: "available" },
    history:        { ru: "История", en: "History" },
    noHistory:      { ru: "Тренировок нет.", en: "No workouts yet." },
    noHistorySub:   { ru: "Начните первую сессию выше!", en: "Start your first session above!" },
    dialogTitle:    { ru: "Новая тренировка", en: "New Workout" },
    titlePlaceholder:{ ru: "Название (напр. День груди)", en: "Workout title (e.g., Push Day)" },
    startBtn:       { ru: "Начать тренировку", en: "Start Workout" },
    starting:       { ru: "Запуск...", en: "Starting..." },
    chooseTemplate: { ru: "Выбор шаблона", en: "Choose Template" },
    exercises:      { ru: "упражнений", en: "exercises" },
    system:         { ru: "Системный", en: "System" },
  },

  // ─── Active workout ───────────────────────────────────────────────────────
  active: {
    setsDone:       { ru: "подходов выполнено", en: "sets done" },
    finish:         { ru: "Завершить", en: "Finish" },
    saving:         { ru: "Сохранение...", en: "Saving..." },
    noExercises:    { ru: "Нет упражнений.", en: "No exercises yet." },
    noExercisesSub: { ru: "Нажмите «Добавить упражнение».", en: "Tap \"Add Exercise\" below to start." },
    addExercise:    { ru: "Добавить упражнение", en: "Add Exercise" },
    restTimer:      { ru: "Отдых", en: "Rest" },
    skip:           { ru: "Пропустить", en: "Skip" },
    finishBar:      { ru: "Завершить тренировку", en: "Finish Workout" },
    dialogTitle:    { ru: "Добавить упражнение", en: "Add Exercise" },
    searchPlaceholder:{ ru: "Поиск упражнений...", en: "Search exercises..." },
    allFilter:      { ru: "Все", en: "All" },
    addSet:         { ru: "Добавить подход", en: "Add Set" },
    newPR:          { ru: "новый рекорд!", en: "new PR!" },
    newPRs:         { ru: "новых рекорда!", en: "new PRs!" },
  },

  // ─── Progress ─────────────────────────────────────────────────────────────
  progress: {
    title:        { ru: "Прогресс и рекорды", en: "Progress & Records" },
    prs:          { ru: "Личные рекорды", en: "Personal Records" },
    total:        { ru: "всего", en: "total" },
    noPRs:        { ru: "Личных рекордов нет.", en: "No personal records yet." },
    noPRsSub:     { ru: "Завершите тренировку, чтобы установить первый рекорд!", en: "Finish a workout to set your first PR!" },
    chartTitle:   { ru: "Максимальный вес со временем (кг)", en: "Max weight over time (kg)" },
    noData:       { ru: "Данных пока нет.", en: "No data points yet." },
  },

  // ─── Calendar ─────────────────────────────────────────────────────────────
  calendar: {
    title:          { ru: "Календарь", en: "Calendar" },
    eventBtn:       { ru: "Событие", en: "Event" },
    noActivity:     { ru: "В этот день активности нет", en: "No activity on this day" },
    upcoming:       { ru: "Ближайшие события", en: "Upcoming Events" },
    createTitle:    { ru: "Создать тренировочное событие", en: "Create Training Event" },
    eventTitle:     { ru: "Название события", en: "Event title" },
    location:       { ru: "Место (необязательно)", en: "Location (optional)" },
    description:    { ru: "Описание (необязательно)", en: "Description (optional)" },
    createBtn:      { ru: "Создать событие", en: "Create Event" },
    creating:       { ru: "Создание...", en: "Creating..." },
    created:        { ru: "Событие создано", en: "Event created" },
  },

  // ─── Friends ─────────────────────────────────────────────────────────────
  friends: {
    title:          { ru: "Друзья", en: "Friends" },
    addBtn:         { ru: "Добавить", en: "Add" },
    incoming:       { ru: "Входящие заявки", en: "Incoming requests" },
    outgoing:       { ru: "Отправленные заявки", en: "Sent requests" },
    pending:        { ru: "Ожидает", en: "Pending" },
    noFriends:      { ru: "Нет друзей пока что.", en: "No friends yet." },
    noFriendsSub:   { ru: "Добавьте кого-нибудь, чтобы делиться прогрессом!", en: "Add friends to share progress!" },
    dialogTitle:    { ru: "Добавить друга", en: "Add Friend" },
    noUsers:        { ru: "Нет доступных пользователей", en: "No other users available" },
    requestSent:    { ru: "Заявка отправлена", en: "Friend request sent" },
    accepted:       { ru: "Заявка принята", en: "Request accepted" },
    declined:       { ru: "Заявка отклонена", en: "Request declined" },
    errorSend:      { ru: "Уже отправлено или ошибка", en: "Already sent or error" },
    friend1:        { ru: "друг", en: "friend" },
    friend234:      { ru: "друга", en: "friends" },
    friend5:        { ru: "друзей", en: "friends" },
    goals: {
      strength:     { ru: "Сила", en: "Strength" },
      hypertrophy:  { ru: "Масса", en: "Hypertrophy" },
      weight_loss:  { ru: "Похудение", en: "Weight Loss" },
      general:      { ru: "Общий", en: "General" },
    },
  },

  // ─── Profile ──────────────────────────────────────────────────────────────
  profile: {
    title:          { ru: "Профиль", en: "Profile" },
    workouts:       { ru: "Тренировки", en: "Workouts" },
    volume:         { ru: "Объём (кг)", en: "Volume (kg)" },
    prs:            { ru: "Рекорды", en: "PRs" },
    darkMode:       { ru: "Тёмная тема", en: "Dark Mode" },
    lightMode:      { ru: "Светлая тема", en: "Light Mode" },
    switchTheme:    { ru: "Нажмите для переключения", en: "Tap to switch" },
    language:       { ru: "Язык", en: "Language" },
    logout:         { ru: "Выйти", en: "Log Out" },
    notifsTitle:    { ru: "Уведомления", en: "Notifications" },
    markAllRead:    { ru: "Отметить все прочитанными", en: "Mark all read" },
    noNotifs:       { ru: "Нет уведомлений", en: "No notifications" },
    goals: {
      strength:     { ru: "Сила", en: "Strength" },
      hypertrophy:  { ru: "Масса", en: "Hypertrophy" },
      weight_loss:  { ru: "Похудение", en: "Weight Loss" },
      general:      { ru: "Общий фитнес", en: "General Fitness" },
    },
  },

  // ─── Exercises ────────────────────────────────────────────────────────────
  exercises: {
    title:          { ru: "Упражнения", en: "Exercises" },
    customBtn:      { ru: "Своё", en: "Custom" },
    searchPlaceholder:{ ru: "Поиск упражнений...", en: "Search exercises..." },
    all:            { ru: "Все", en: "All" },
    count:          { ru: "упражнений", en: "exercises" },
    custom:         { ru: "Своё", en: "Custom" },
    createTitle:    { ru: "Создать упражнение", en: "Create Custom Exercise" },
    namePlaceholder:{ ru: "Название упражнения", en: "Exercise name" },
    muscleGroup:    { ru: "Группа мышц", en: "Muscle group" },
    equipment:      { ru: "Инвентарь", en: "Equipment" },
    createBtn:      { ru: "Создать упражнение", en: "Create Exercise" },
    creating:       { ru: "Создание...", en: "Creating..." },
    created:        { ru: "Упражнение создано", en: "Exercise created" },
    muscles: {
      chest:      { ru: "Грудь", en: "Chest" },
      back:       { ru: "Спина", en: "Back" },
      legs:       { ru: "Ноги", en: "Legs" },
      shoulders:  { ru: "Плечи", en: "Shoulders" },
      arms:       { ru: "Руки", en: "Arms" },
      core:       { ru: "Пресс", en: "Core" },
    },
    equip: {
      barbell:    { ru: "Штанга", en: "Barbell" },
      dumbbell:   { ru: "Гантели", en: "Dumbbell" },
      machine:    { ru: "Тренажёр", en: "Machine" },
      bodyweight: { ru: "Без инвентаря", en: "Bodyweight" },
      cables:     { ru: "Кроссовер", en: "Cables" },
    },
  },

  // ─── Templates ────────────────────────────────────────────────────────────
  templates: {
    title:          { ru: "Шаблоны и программы", en: "Templates & Programs" },
    templatesLabel: { ru: "Шаблоны тренировок", en: "Workout Templates" },
    programsLabel:  { ru: "Программы тренировок", en: "Training Programs" },
    system:         { ru: "Системный", en: "System" },
    weeks:          { ru: "нед.", en: "wk" },
    trainingDays:   { ru: "тренировочных дней/нед.", en: "training days/week" },
    createTitle:    { ru: "Новый шаблон", en: "New Template" },
    namePlaceholder:{ ru: "Название шаблона", en: "Template name" },
    createBtn:      { ru: "Создать шаблон", en: "Create Template" },
  },

  // ─── Muscle groups (shared) ───────────────────────────────────────────────
  muscleShort: {
    chest:      { ru: "Гр", en: "Ch" },
    back:       { ru: "Сп", en: "Bk" },
    legs:       { ru: "Но", en: "Lg" },
    shoulders:  { ru: "Пл", en: "Sh" },
    arms:       { ru: "Ру", en: "Ar" },
    core:       { ru: "Пр", en: "Co" },
  },
} as const;

// Helper: get translation string
export function t(
  path: string,
  lang: Lang
): string {
  const keys = path.split(".");
  let node: any = translations;
  for (const k of keys) {
    if (!node || typeof node !== "object") return path;
    node = node[k];
  }
  if (node && typeof node === "object" && (lang in node)) {
    return node[lang] as string;
  }
  return path;
}
