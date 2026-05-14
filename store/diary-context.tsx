import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useReducer } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type Priority = 'low' | 'medium' | 'high';
export type TodoCategory = 'work' | 'personal' | 'shopping' | 'health' | 'other';
export type ExpenseCategory =
    | 'food'
    | 'transport'
    | 'shopping'
    | 'entertainment'
    | 'health'
    | 'bills'
    | 'salary'
    | 'other';
export type EventType = 'work' | 'personal' | 'meeting' | 'reminder';
export type Mood = 'great' | 'good' | 'okay' | 'bad' | 'terrible';

export interface BudgetLimits {
    dailyLimit?: number;
    monthlyLimit?: number;
}

export interface TodoItem {
    id: string;
    title: string;
    completed: boolean;
    category: TodoCategory;
    priority: Priority;
    dueDate?: string;
    reminderTime?: string;    // 'HH:MM' — time of day for the alarm
    notificationId?: string;  // expo-notifications identifier for cancellation
    spillover?: boolean;      // was this carried over from a previous day?
    autoSpillover?: boolean;  // automatically move to next day if not completed
    itemType?: 'task' | 'activity';      // task = normal, activity = has timer
    activityMode?: 'timer' | 'stopwatch' | 'none'; // countdown vs count-up vs no timer
    timerDuration?: number;              // seconds for countdown timer
    timeSpent?: number;                  // seconds accumulated so far
    timerStartedAt?: string;             // ISO timestamp when currently running
    createdAt: string;
}

export interface Expense {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    category: ExpenseCategory;
    note: string;
    date: string;
    createdAt: string;
}

export interface ScheduleEvent {
    id: string;
    title: string;
    date: string;
    startTime: string;
    endTime: string;
    type: EventType;
    note: string;
    location: string;
    createdAt: string;
}

export interface DiaryEntry {
    id: string;
    title: string;
    content: string;
    date: string;
    mood?: Mood;
    tags: string[];
    createdAt: string;
}

// ─── State & Actions ─────────────────────────────────────────────────────────

interface DiaryState {
    todos: TodoItem[];
    expenses: Expense[];
    events: ScheduleEvent[];
    entries: DiaryEntry[];
    isLoaded: boolean;
    budgetLimits: BudgetLimits;
}

type DiaryAction =
    | { type: 'LOAD_DATA'; payload: DiaryState }
    | { type: 'MARK_LOADED' }
    | { type: 'ADD_TODO'; payload: TodoItem }
    | { type: 'UPDATE_TODO'; payload: TodoItem }
    | { type: 'DELETE_TODO'; payload: string }
    | { type: 'TOGGLE_TODO'; payload: string }
    | { type: 'UPDATE_TODO_NOTIFICATION'; payload: { id: string; notificationId: string } }
    | { type: 'ADD_EXPENSE'; payload: Expense }
    | { type: 'DELETE_EXPENSE'; payload: string }
    | { type: 'ADD_EVENT'; payload: ScheduleEvent }
    | { type: 'UPDATE_EVENT'; payload: ScheduleEvent }
    | { type: 'DELETE_EVENT'; payload: string }
    | { type: 'ADD_ENTRY'; payload: DiaryEntry }
    | { type: 'UPDATE_ENTRY'; payload: DiaryEntry }
    | { type: 'DELETE_ENTRY'; payload: string }
    | { type: 'SET_BUDGET'; payload: BudgetLimits };

const initialState: DiaryState = { todos: [], expenses: [], events: [], entries: [], isLoaded: false, budgetLimits: {} };

function reducer(state: DiaryState, action: DiaryAction): DiaryState {
    switch (action.type) {
        case 'LOAD_DATA':
            return { ...action.payload, budgetLimits: action.payload.budgetLimits ?? {}, isLoaded: true };
        case 'MARK_LOADED':
            return { ...state, isLoaded: true };
        case 'ADD_TODO':
            return { ...state, todos: [action.payload, ...state.todos] };
        case 'UPDATE_TODO':
            return { ...state, todos: state.todos.map(t => (t.id === action.payload.id ? action.payload : t)) };
        case 'DELETE_TODO':
            return { ...state, todos: state.todos.filter(t => t.id !== action.payload) };
        case 'TOGGLE_TODO':
            return { ...state, todos: state.todos.map(t => (t.id === action.payload ? { ...t, completed: !t.completed } : t)) };
        case 'UPDATE_TODO_NOTIFICATION':
            return { ...state, todos: state.todos.map(t => t.id === action.payload.id ? { ...t, notificationId: action.payload.notificationId } : t) };
        case 'ADD_EXPENSE':
            return { ...state, expenses: [action.payload, ...state.expenses] };
        case 'DELETE_EXPENSE':
            return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };
        case 'ADD_EVENT':
            return { ...state, events: [action.payload, ...state.events] };
        case 'UPDATE_EVENT':
            return { ...state, events: state.events.map(e => (e.id === action.payload.id ? action.payload : e)) };
        case 'DELETE_EVENT':
            return { ...state, events: state.events.filter(e => e.id !== action.payload) };
        case 'ADD_ENTRY':
            return { ...state, entries: [action.payload, ...state.entries] };
        case 'UPDATE_ENTRY':
            return { ...state, entries: state.entries.map(e => (e.id === action.payload.id ? action.payload : e)) };
        case 'DELETE_ENTRY':
            return { ...state, entries: state.entries.filter(e => e.id !== action.payload) };
        case 'SET_BUDGET':
            return { ...state, budgetLimits: action.payload };
        default:
            return state;
    }
}

// ─── Context ─────────────────────────────────────────────────────────────────

interface DiaryContextType extends DiaryState {
    addTodo: (todo: Omit<TodoItem, 'id' | 'createdAt'>) => void;
    updateTodo: (todo: TodoItem) => void;
    deleteTodo: (id: string) => void;
    toggleTodo: (id: string) => void;
    setTodoNotificationId: (id: string, notificationId: string) => void;
    spilloverTodo: (todo: TodoItem, toDate: string) => void;
    addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
    deleteExpense: (id: string) => void;
    addEvent: (event: Omit<ScheduleEvent, 'id' | 'createdAt'>) => void;
    updateEvent: (event: ScheduleEvent) => void;
    deleteEvent: (id: string) => void;
    addEntry: (entry: Omit<DiaryEntry, 'id' | 'createdAt'>) => void;
    updateEntry: (entry: DiaryEntry) => void;
    deleteEntry: (id: string) => void;
    setBudgetLimits: (limits: BudgetLimits) => void;
}

const DiaryContext = createContext<DiaryContextType | null>(null);

const STORAGE_KEY = '@diary_app_data_v1';

const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export function DiaryProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(reducer, initialState);

    // Load persisted data on mount
    useEffect(() => {
        AsyncStorage.getItem(STORAGE_KEY)
            .then(data => {
                if (data) {
                    try {
                        dispatch({ type: 'LOAD_DATA', payload: JSON.parse(data) });
                    } catch {
                        // corrupted data – start fresh
                        dispatch({ type: 'MARK_LOADED' });
                    }
                } else {
                    // first launch – no data yet
                    dispatch({ type: 'MARK_LOADED' });
                }
            })
            .catch(() => { dispatch({ type: 'MARK_LOADED' }); });
    }, []);

    // Persist state whenever it changes
    useEffect(() => {
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => { });
    }, [state]);

    const value: DiaryContextType = {
        ...state,
        addTodo: todo =>
            dispatch({ type: 'ADD_TODO', payload: { ...todo, id: genId(), createdAt: new Date().toISOString() } }),
        updateTodo: todo => dispatch({ type: 'UPDATE_TODO', payload: todo }),
        deleteTodo: id => dispatch({ type: 'DELETE_TODO', payload: id }),
        toggleTodo: id => dispatch({ type: 'TOGGLE_TODO', payload: id }),
        setTodoNotificationId: (id, notificationId) =>
            dispatch({ type: 'UPDATE_TODO_NOTIFICATION', payload: { id, notificationId } }),
        spilloverTodo: (todo, toDate) =>
            dispatch({ type: 'ADD_TODO', payload: { ...todo, id: genId(), dueDate: toDate, completed: false, spillover: true, reminderTime: undefined, notificationId: undefined, createdAt: new Date().toISOString() } }),
        addExpense: expense =>
            dispatch({ type: 'ADD_EXPENSE', payload: { ...expense, id: genId(), createdAt: new Date().toISOString() } }),
        deleteExpense: id => dispatch({ type: 'DELETE_EXPENSE', payload: id }),
        addEvent: event =>
            dispatch({ type: 'ADD_EVENT', payload: { ...event, id: genId(), createdAt: new Date().toISOString() } }),
        updateEvent: event => dispatch({ type: 'UPDATE_EVENT', payload: event }),
        deleteEvent: id => dispatch({ type: 'DELETE_EVENT', payload: id }),
        addEntry: entry =>
            dispatch({ type: 'ADD_ENTRY', payload: { ...entry, id: genId(), createdAt: new Date().toISOString() } }),
        updateEntry: entry => dispatch({ type: 'UPDATE_ENTRY', payload: entry }),
        deleteEntry: id => dispatch({ type: 'DELETE_ENTRY', payload: id }),
        setBudgetLimits: limits => dispatch({ type: 'SET_BUDGET', payload: limits }),
    };

    return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary() {
    const ctx = useContext(DiaryContext);
    if (!ctx) throw new Error('useDiary must be used within DiaryProvider');
    return ctx;
}
