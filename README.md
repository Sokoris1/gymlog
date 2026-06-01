# GymLog — Training Diary PWA

Мобильное PWA-приложение для ведения дневника тренировок.

## Стек
- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Express + Drizzle ORM
- **База данных**: PostgreSQL (Neon)

---

## Локальный запуск

### 1. Создай базу данных на Neon

1. Зарегистрируйся на [neon.tech](https://neon.tech) — бесплатно
2. Создай новый проект
3. Скопируй **Connection string** (DATABASE_URL)

### 2. Настрой переменные окружения

```bash
cp .env.example .env
# Открой .env и вставь свой DATABASE_URL
```

### 3. Установи зависимости и создай таблицы

```bash
npm install
npm run db:push   # создаёт таблицы в Postgres
npm run dev       # запускает на http://localhost:5000
```

При первом запуске база автоматически засевается 51 упражнением, 4 шаблонами и 2 демо-пользователями.

### Демо-аккаунты
| Логин | Имя | Цель |
|-------|-----|------|
| `alexp` | Alex Petrov | Сила |
| `mvolkova` | Maria Volkova | Гипертрофия |

---

## Деплой на Render (бесплатно) + Neon

### 1. База данных — Neon (бесплатно, постоянная)

1. [neon.tech](https://neon.tech) → создай проект → скопируй Connection string

### 2. Код — GitHub

```bash
git init
git add .
git commit -m "initial"
gh repo create gymlog --public --push
# или вручную создай репо на github.com и запушь
```

### 3. Деплой — Render

1. Зайди на [render.com](https://render.com) → **New Web Service**
2. Подключи GitHub репозиторий
3. Render автоматически подхватит `render.yaml`
4. В разделе **Environment Variables** добавь:
   - `DATABASE_URL` = твой connection string из Neon
5. Нажми **Deploy**

Render сам запустит `npm install && npm run build && npm start`.

### 4. Создай таблицы в продакшн БД

После первого деплоя зайди в **Shell** на Render и выполни:
```bash
npm run db:push
```
Или выполни локально с продакшн DATABASE_URL:
```bash
DATABASE_URL=postgresql://... npm run db:push
```

---

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Разработка (порт 5000) |
| `npm run build` | Сборка для продакшна |
| `npm start` | Запуск продакшн сборки |
| `npm run db:push` | Применить схему к БД |
