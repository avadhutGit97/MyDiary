import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
    EventType,
    ExpenseCategory,
    Priority,
    TodoCategory,
    TodoItem,
    useDiary,
} from '@/store/diary-context';
import { cancelTaskReminder, scheduleTaskReminder } from '@/utils/notifications';

// ─── Constants ────────────────────────────────────────────────────────────────

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

const TODO_CATEGORIES: { key: TodoCategory; emoji: string; label: string }[] = [
    { key: 'work', emoji: '💼', label: 'Work' },
    { key: 'personal', emoji: '👤', label: 'Personal' },
    { key: 'shopping', emoji: '🛒', label: 'Shopping' },
    { key: 'health', emoji: '❤️', label: 'Health' },
    { key: 'exercise', emoji: '🏃', label: 'Exercise' },
    { key: 'other', emoji: '📌', label: 'Other' },
];

const EXPENSE_CATS: { key: ExpenseCategory; emoji: string; label: string }[] = [
    { key: 'food', emoji: '🍔', label: 'Food' },
    { key: 'transport', emoji: '🚗', label: 'Transport' },
    { key: 'shopping', emoji: '🛍️', label: 'Shopping' },
    { key: 'entertainment', emoji: '🎬', label: 'Entertainment' },
    { key: 'health', emoji: '💊', label: 'Health' },
    { key: 'exercise', emoji: '🏋️', label: 'Exercise' },
    { key: 'bills', emoji: '📄', label: 'Bills' },
    { key: 'salary', emoji: '💰', label: 'Salary' },
    { key: 'other', emoji: '📦', label: 'Other' },
];

const EVENT_TYPES: { key: EventType; emoji: string; label: string; color: (c: (typeof Colors)['light']) => string }[] = [
    { key: 'work', emoji: '💼', label: 'Work', color: c => c.info },
    { key: 'meeting', emoji: '👥', label: 'Meeting', color: c => c.tint },
    { key: 'personal', emoji: '👤', label: 'Personal', color: c => c.success },
    { key: 'reminder', emoji: '🔔', label: 'Reminder', color: c => c.accent },
];

type DayTab = 'todo' | 'expenses' | 'events';

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function DayScreen() {
    const { date, tab: initialTab } = useLocalSearchParams<{ date: string; tab?: string }>();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const c = Colors[colorScheme ?? 'light'];
    const diary = useDiary();

    const [activeTab, setActiveTab] = useState<DayTab>(
        initialTab === 'expenses' ? 'expenses' : initialTab === 'events' ? 'events' : 'todo'
    );

    // Parse date for display
    const [y, m, d] = date.split('-').map(Number);
    const displayDate = `${MONTHS[m - 1]} ${d}, ${y}`;
    const dayName = new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'long' });

    const s = styles(c);

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Text style={s.backArrow}>‹</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={s.dayName}>{dayName}</Text>
                    <Text style={s.dateText}>{displayDate}</Text>
                </View>
            </View>

            {/* Tab Bar */}
            <View style={s.tabBar}>
                {(['todo', 'expenses', 'events'] as DayTab[]).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[s.tabBtn, activeTab === tab && s.tabBtnActive]}
                        onPress={() => setActiveTab(tab)}>
                        <Text style={[s.tabLabel, activeTab === tab && s.tabLabelActive]}>
                            {tab === 'todo' ? '✅ To-Do' : tab === 'expenses' ? '💳 Expenses' : '📅 Events'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content */}
            {activeTab === 'todo' && <TodoTab date={date} c={c} diary={diary} />}
            {activeTab === 'expenses' && <ExpensesTab date={date} c={c} diary={diary} />}
            {activeTab === 'events' && <EventsTab date={date} c={c} diary={diary} />}
        </SafeAreaView>
    );
}

// ─── To-Do Tab ───────────────────────────────────────────────────────────────

function TodoTab({ date, c, diary }: { date: string; c: (typeof Colors)['light']; diary: ReturnType<typeof useDiary> }) {
    const { todos, addTodo, updateTodo, toggleTodo, deleteTodo, setTodoNotificationId, spilloverTodo } = diary;
    const dayTodos = useMemo(() => todos.filter(t => t.dueDate === date), [todos, date]);

    // Always-current ref so async callbacks can access latest todos without stale closure
    const todosRef = useRef(todos);
    useEffect(() => { todosRef.current = todos; });

    // Add modal state
    const [addModal, setAddModal] = useState(false);
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<TodoCategory>('personal');
    const [priority, setPriority] = useState<Priority>('medium');
    const [reminderEnabled, setReminderEnabled] = useState(false);
    const [reminderTime, setReminderTime] = useState('09:00');
    const [autoSpillover, setAutoSpillover] = useState(false);
    const [activityMode, setActivityMode] = useState<'timer' | 'stopwatch' | 'none'>('none');
    const [timerDurationStr, setTimerDurationStr] = useState('');

    // Edit modal state
    const [editModal, setEditModal] = useState(false);
    const [editingTodo, setEditingTodo] = useState<typeof dayTodos[0] | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editCategory, setEditCategory] = useState<TodoCategory>('personal');
    const [editPriority, setEditPriority] = useState<Priority>('medium');
    const [editReminderEnabled, setEditReminderEnabled] = useState(false);
    const [editReminderTime, setEditReminderTime] = useState('09:00');
    const [editAutoSpillover, setEditAutoSpillover] = useState(false);
    const [editActivityMode, setEditActivityMode] = useState<'timer' | 'stopwatch' | 'none'>('none');
    const [editTimerDurationStr, setEditTimerDurationStr] = useState('');

    function resetAddForm() {
        setTitle(''); setCategory('personal'); setPriority('medium');
        setReminderEnabled(false); setReminderTime('09:00'); setAutoSpillover(false);
        setActivityMode('none'); setTimerDurationStr('');
    }

    function openEdit(todo: typeof dayTodos[0]) {
        setEditingTodo(todo);
        setEditTitle(todo.title);
        setEditCategory(todo.category);
        setEditPriority(todo.priority);
        setEditReminderEnabled(!!todo.reminderTime);
        setEditReminderTime(todo.reminderTime ?? '09:00');
        setEditAutoSpillover(!!todo.autoSpillover);
        setEditActivityMode(todo.activityMode ?? 'none');
        setEditTimerDurationStr(todo.timerDuration ? String(Math.round(todo.timerDuration / 60)) : '');
        setEditModal(true);
    }

    async function handleAdd() {
        if (!title.trim()) { Alert.alert('Error', 'Task title is required'); return; }
        const rTime = reminderEnabled ? reminderTime : undefined;
        const derivedItemType = activityMode === 'none' ? 'task' : 'activity';
        const durSecs = activityMode === 'timer'
            ? (parseFloat(timerDurationStr) * 60 || undefined) : undefined;
        addTodo({
            title: title.trim(), completed: false, category, priority,
            dueDate: date, reminderTime: rTime, autoSpillover,
            itemType: derivedItemType,
            activityMode: activityMode !== 'none' ? activityMode : undefined,
            timerDuration: durSecs,
        });
        resetAddForm();
        setAddModal(false);

        if (reminderEnabled && rTime) {
            const tempId = `${Date.now()}`;
            const notifId = await scheduleTaskReminder(tempId, title.trim(), date, rTime);
            if (notifId) {
                setTimeout(() => {
                    // Use todosRef.current (always fresh) instead of stale diary.todos
                    const newTodo = todosRef.current.find(t => t.dueDate === date && !t.notificationId && t.title === title.trim());
                    if (newTodo) setTodoNotificationId(newTodo.id, notifId);
                }, 300);
            }
        }
    }

    async function handleSaveEdit() {
        if (!editingTodo) return;
        if (!editTitle.trim()) { Alert.alert('Error', 'Task title is required'); return; }

        // Cancel old notification if reminder changed
        if (editingTodo.notificationId && (!editReminderEnabled || editReminderTime !== editingTodo.reminderTime)) {
            cancelTaskReminder(editingTodo.notificationId);
        }

        const rTime = editReminderEnabled ? editReminderTime : undefined;
        const derivedEditItemType = editActivityMode === 'none' ? 'task' : 'activity';
        const editDurSecs = editActivityMode === 'timer'
            ? (parseFloat(editTimerDurationStr) * 60 || undefined) : undefined;
        const updated = {
            ...editingTodo,
            title: editTitle.trim(),
            category: editCategory,
            priority: editPriority,
            reminderTime: rTime,
            autoSpillover: editAutoSpillover,
            notificationId: editReminderEnabled ? editingTodo.notificationId : undefined,
            itemType: derivedEditItemType,
            activityMode: editActivityMode !== 'none' ? editActivityMode : undefined,
            timerDuration: editDurSecs,
        };
        updateTodo(updated);
        setEditModal(false);
        setEditingTodo(null);

        // Schedule new notification only if time changed or no existing notification
        if (editReminderEnabled && rTime && (editReminderTime !== editingTodo.reminderTime || !editingTodo.notificationId)) {
            const notifId = await scheduleTaskReminder(updated.id, updated.title, date, rTime);
            if (notifId) setTodoNotificationId(updated.id, notifId);
        }
    }

    function handleDelete(id: string, notificationId?: string) {
        Alert.alert('Delete', 'Remove this task?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: () => {
                    if (notificationId) cancelTaskReminder(notificationId);
                    deleteTodo(id);
                }
            },
        ]);
    }

    function handleToggleAutoSpillover(todo: typeof dayTodos[0]) {
        updateTodo({ ...todo, autoSpillover: !todo.autoSpillover });
    }

    function handleToggle(todo: typeof dayTodos[0]) {
        if (!todo.completed && todo.notificationId) {
            cancelTaskReminder(todo.notificationId);
        }
        toggleTodo(todo.id);
    }

    const s = tabStyles(c);
    const done = dayTodos.filter(t => t.completed).length;

    return (
        <View style={s.container}>
            <View style={s.subHeader}>
                <Text style={s.subTitle}>{dayTodos.length} tasks · {done} done</Text>
                <TouchableOpacity style={s.addBtn} onPress={() => setAddModal(true)}>
                    <Text style={s.addBtnText}>+ Add Task</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.list}>
                {dayTodos.length === 0 && <EmptyState emoji="✅" message="No tasks for this day" />}
                {dayTodos.map(todo => {
                    const cat = TODO_CATEGORIES.find(cc => cc.key === todo.category);
                    const pColor = todo.priority === 'high' ? c.danger : todo.priority === 'medium' ? c.accent : c.success;
                    return (
                        <View key={todo.id} style={[s.card, { borderLeftWidth: 3, borderLeftColor: pColor, flexDirection: 'column' }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                <TouchableOpacity
                                    style={[s.checkbox, todo.completed && { backgroundColor: c.tint, borderColor: c.tint }]}
                                    onPress={() => handleToggle(todo)}>
                                    {todo.completed && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                                </TouchableOpacity>
                                <View style={{ flex: 1 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                        <Text style={[s.cardTitle, todo.completed && s.strikethrough]} numberOfLines={2}>{todo.title}</Text>
                                        {todo.spillover && (
                                            <View style={[s.badge, { backgroundColor: c.info + '22', borderColor: c.info }]}>
                                                <Text style={[s.badgeText, { color: c.info }]}>↩ carried</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                                        <Text style={s.cardMeta}>{cat?.emoji} {cat?.label}</Text>
                                        <View style={[s.badge, { backgroundColor: pColor + '22', borderColor: pColor }]}>
                                            <Text style={[s.badgeText, { color: pColor }]}>{todo.priority}</Text>
                                        </View>
                                        {todo.reminderTime && !todo.completed && (
                                            <View style={[s.badge, { backgroundColor: c.tint + '22', borderColor: c.tint }]}>
                                                <Text style={[s.badgeText, { color: c.tint }]}>🔔 {todo.reminderTime}</Text>
                                            </View>
                                        )}
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                            <Text style={{ fontSize: 11, color: c.subtext }}>↩ auto</Text>
                                            <Switch
                                                value={!!todo.autoSpillover}
                                                onValueChange={() => handleToggleAutoSpillover(todo)}
                                                trackColor={{ false: c.border, true: c.accent }}
                                                thumbColor={todo.autoSpillover ? '#fff' : '#f4f3f4'}
                                                style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                                            />
                                        </View>
                                    </View>
                                </View>
                                <View style={{ gap: 6 }}>
                                    <TouchableOpacity
                                        style={[s.iconActionBtn, { backgroundColor: c.tint + '22' }]}
                                        onPress={() => openEdit(todo)}>
                                        <Text style={{ fontSize: 14 }}>✏️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[s.iconActionBtn, { backgroundColor: c.danger + '22' }]}
                                        onPress={() => handleDelete(todo.id, todo.notificationId)}>
                                        <Text style={{ fontSize: 14 }}>🗑</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                            {!!todo.activityMode && todo.activityMode !== 'none' && (
                                <ActivityTimer todo={todo} c={c} updateTodo={updateTodo} />
                            )}
                        </View>
                    );
                })}
            </ScrollView>

            {/* Add Modal */}
            <Modal visible={addModal} animationType="slide" transparent>
                <View style={s.overlay}>
                    <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                        <ModalHeader title="New Task" onClose={() => { setAddModal(false); resetAddForm(); }} c={c} />
                        <Label text="Title *" c={c} />
                        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Task title..." placeholderTextColor={c.subtext} />
                        <Label text="Category" c={c} />
                        <ChipRow items={TODO_CATEGORIES.map(cat => ({ key: cat.key, label: `${cat.emoji} ${cat.label}` }))} selected={category} onSelect={v => setCategory(v as TodoCategory)} c={c} />
                        <Label text="Priority" c={c} />
                        <ChipRow
                            items={[{ key: 'high', label: '🔴 High' }, { key: 'medium', label: '🟡 Medium' }, { key: 'low', label: '🟢 Low' }]}
                            selected={priority} onSelect={v => setPriority(v as Priority)} c={c} />
                        <Label text="Mode" c={c} />
                        <ChipRow
                            items={[{ key: 'none', label: 'None' }, { key: 'timer', label: 'Timer' }, { key: 'stopwatch', label: 'Stopwatch' }]}
                            selected={activityMode} onSelect={v => setActivityMode(v as 'timer' | 'stopwatch' | 'none')} c={c} />
                        {activityMode !== 'none' && (
                            <>
                                {activityMode === 'timer' && (
                                    <>
                                        <Label text="Duration (minutes)" c={c} />
                                        <TextInput
                                            style={s.input}
                                            value={timerDurationStr}
                                            onChangeText={setTimerDurationStr}
                                            placeholder="e.g. 25"
                                            placeholderTextColor={c.subtext}
                                            keyboardType="numeric"
                                        />
                                    </>
                                )}
                            </>
                        )}
                        <ReminderFields
                            enabled={reminderEnabled} onToggleEnabled={setReminderEnabled}
                            time={reminderTime} onChangeTime={setReminderTime}
                            forDate={date}
                            autoSpillover={autoSpillover} onToggleAuto={setAutoSpillover}
                            c={c} s={s}
                        />
                        <TouchableOpacity style={s.saveBtn} onPress={handleAdd}>
                            <Text style={s.saveBtnText}>Add Task</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* Edit Modal */}
            <Modal visible={editModal} animationType="slide" transparent>
                <View style={s.overlay}>
                    <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                        <ModalHeader title="Edit Task" onClose={() => { setEditModal(false); setEditingTodo(null); }} c={c} />
                        <Label text="Title *" c={c} />
                        <TextInput style={s.input} value={editTitle} onChangeText={setEditTitle} placeholder="Task title..." placeholderTextColor={c.subtext} />
                        <Label text="Category" c={c} />
                        <ChipRow items={TODO_CATEGORIES.map(cat => ({ key: cat.key, label: `${cat.emoji} ${cat.label}` }))} selected={editCategory} onSelect={v => setEditCategory(v as TodoCategory)} c={c} />
                        <Label text="Priority" c={c} />
                        <ChipRow
                            items={[{ key: 'high', label: '🔴 High' }, { key: 'medium', label: '🟡 Medium' }, { key: 'low', label: '🟢 Low' }]}
                            selected={editPriority} onSelect={v => setEditPriority(v as Priority)} c={c} />
                        <Label text="Mode" c={c} />
                        <ChipRow
                            items={[{ key: 'none', label: 'None' }, { key: 'timer', label: 'Timer' }, { key: 'stopwatch', label: 'Stopwatch' }]}
                            selected={editActivityMode} onSelect={v => setEditActivityMode(v as 'timer' | 'stopwatch' | 'none')} c={c} />
                        {editActivityMode !== 'none' && (
                            <>
                                {editActivityMode === 'timer' && (
                                    <>
                                        <Label text="Duration (minutes)" c={c} />
                                        <TextInput
                                            style={s.input}
                                            value={editTimerDurationStr}
                                            onChangeText={setEditTimerDurationStr}
                                            placeholder="e.g. 25"
                                            placeholderTextColor={c.subtext}
                                            keyboardType="numeric"
                                        />
                                    </>
                                )}
                            </>
                        )}
                        <ReminderFields
                            enabled={editReminderEnabled} onToggleEnabled={setEditReminderEnabled}
                            time={editReminderTime} onChangeTime={setEditReminderTime}
                            forDate={date}
                            autoSpillover={editAutoSpillover} onToggleAuto={setEditAutoSpillover}
                            c={c} s={s}
                        />
                        <TouchableOpacity style={s.saveBtn} onPress={handleSaveEdit}>
                            <Text style={s.saveBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

// ─── Reminder Fields (shared between add/edit modals) ────────────────────────

function ReminderFields({ enabled, onToggleEnabled, time, onChangeTime, forDate, autoSpillover, onToggleAuto, c, s }: {
    enabled: boolean;
    onToggleEnabled: (v: boolean) => void;
    time: string;
    onChangeTime: (v: string) => void;
    forDate: string;
    autoSpillover: boolean;
    onToggleAuto: (v: boolean) => void;
    c: (typeof Colors)['light'];
    s: ReturnType<typeof tabStyles>;
}) {
    const [showPicker, setShowPicker] = useState(false);

    const timeAsDate = (() => {
        const [h, m] = time.split(':').map(Number);
        const d = new Date();
        d.setHours(isNaN(h) ? 9 : h, isNaN(m) ? 0 : m, 0, 0);
        return d;
    })();

    return (
        <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 4 }}>
                <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>↩ Auto-Spillover</Text>
                    <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>Move to next day automatically if not done</Text>
                </View>
                <Switch value={autoSpillover} onValueChange={onToggleAuto} trackColor={{ false: c.border, true: c.accent }} thumbColor={autoSpillover ? '#fff' : '#f4f3f4'} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 4 }}>
                <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: c.text }}>🔔 Set Reminder</Text>
                    <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>Alarm will ring at the chosen time</Text>
                </View>
                <Switch value={enabled} onValueChange={onToggleEnabled} trackColor={{ false: c.border, true: c.tint }} thumbColor={enabled ? '#fff' : '#f4f3f4'} />
            </View>
            {enabled && (
                <View style={{ marginTop: 4 }}>
                    <TouchableOpacity
                        style={[s.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}
                        onPress={() => setShowPicker(true)}
                        activeOpacity={0.7}>
                        <Text style={{ fontSize: 15, color: c.text }}>⏰  {time}</Text>
                        <Text style={{ fontSize: 12, color: c.tint, fontWeight: '600' }}>Change</Text>
                    </TouchableOpacity>
                    {showPicker && (
                        <DateTimePicker
                            value={timeAsDate}
                            mode="time"
                            is24Hour
                            display="spinner"
                            onChange={(_, selected) => {
                                setShowPicker(false);
                                if (selected) {
                                    const h = selected.getHours().toString().padStart(2, '0');
                                    const m = selected.getMinutes().toString().padStart(2, '0');
                                    onChangeTime(`${h}:${m}`);
                                }
                            }}
                        />
                    )}
                    <Text style={{ fontSize: 11, color: c.subtext, marginTop: 6 }}>Fires on {forDate} at {time}</Text>
                </View>
            )}
        </>
    );
}

// ─── Activity Timer ──────────────────────────────────────────────────────────

function ActivityTimer({ todo, c, updateTodo }: {
    todo: TodoItem;
    c: (typeof Colors)['light'];
    updateTodo: (t: TodoItem) => void;
}) {
    const isStopwatch = todo.activityMode !== 'timer';
    const totalDuration = (todo.timerDuration ?? 0);

    function getInitialElapsed() {
        const base = todo.timeSpent ?? 0;
        if (todo.timerStartedAt) {
            const extra = (Date.now() - new Date(todo.timerStartedAt).getTime()) / 1000;
            return base + extra;
        }
        return base;
    }

    const [elapsed, setElapsed] = useState(getInitialElapsed);
    const [running, setRunning] = useState(!!todo.timerStartedAt);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const elapsedRef = useRef(elapsed);
    const todoRef = useRef(todo);

    useEffect(() => { elapsedRef.current = elapsed; });
    useEffect(() => { todoRef.current = todo; });

    // Handle countdown completion — safe side-effect location
    useEffect(() => {
        if (!isStopwatch && totalDuration > 0 && elapsed >= totalDuration && running) {
            setRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            updateTodo({ ...todoRef.current, timeSpent: totalDuration, timerStartedAt: undefined });
        }
    }, [elapsed]);

    useEffect(() => {
        if (running) {
            intervalRef.current = setInterval(() => {
                setElapsed(e => e + 1);
            }, 1000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [running]);

    function handleStart() {
        setRunning(true);
        updateTodo({ ...todoRef.current, timerStartedAt: new Date().toISOString(), timeSpent: Math.floor(elapsedRef.current) });
    }

    function handlePause() {
        setRunning(false);
        updateTodo({ ...todoRef.current, timeSpent: Math.floor(elapsedRef.current), timerStartedAt: undefined });
    }

    function handleReset() {
        setRunning(false);
        setElapsed(0);
        updateTodo({ ...todoRef.current, timeSpent: 0, timerStartedAt: undefined });
    }

    const display = isStopwatch ? elapsed : Math.max(0, totalDuration - elapsed);
    const h = Math.floor(display / 3600);
    const mm = Math.floor((display % 3600) / 60);
    const ss = Math.floor(display % 60);
    const timeStr = h > 0
        ? `${h}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
        : `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    const pct = !isStopwatch && totalDuration > 0 ? Math.min(1, elapsed / totalDuration) : 0;

    return (
        <View style={{ marginTop: 10, backgroundColor: c.background, borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: 10, color: c.subtext, fontWeight: '600', textAlign: 'center', letterSpacing: 1 }}>
                {isStopwatch ? '⏱ STOPWATCH' : `⏳ TIMER · ${Math.floor(totalDuration / 60)}m`}
            </Text>
            <Text style={{ fontSize: 30, fontWeight: '800', color: running ? c.tint : c.text, textAlign: 'center', letterSpacing: 3, marginTop: 2 }}>
                {timeStr}
            </Text>
            {!isStopwatch && totalDuration > 0 && (
                <View style={{ height: 4, backgroundColor: c.border, borderRadius: 2, marginTop: 6, overflow: 'hidden' }}>
                    <View style={{ flex: pct, height: 4, backgroundColor: pct > 0.85 ? c.danger : c.tint }} />
                </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 10 }}>
                {!running ? (
                    <TouchableOpacity onPress={handleStart} style={{ backgroundColor: c.tint, paddingHorizontal: 22, paddingVertical: 8, borderRadius: 20 }}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>▶ Start</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity onPress={handlePause} style={{ backgroundColor: '#F59E0B', paddingHorizontal: 22, paddingVertical: 8, borderRadius: 20 }}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>⏸ Pause</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleReset} style={{ backgroundColor: c.border, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 }}>
                    <Text style={{ color: c.text, fontWeight: '600', fontSize: 13 }}>↺ Reset</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// ─── Expenses Tab ─────────────────────────────────────────────────────────────

function ExpensesTab({ date, c, diary }: { date: string; c: (typeof Colors)['light']; diary: ReturnType<typeof useDiary> }) {
    const { expenses, addExpense, deleteExpense } = diary;
    const dayExpenses = useMemo(() => expenses.filter(e => e.date === date), [expenses, date]);

    const [modal, setModal] = useState(false);
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [category, setCategory] = useState<ExpenseCategory>('food');
    const [note, setNote] = useState('');

    const income = dayExpenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
    const spent = dayExpenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0);

    function handleAdd() {
        const num = parseFloat(amount);
        if (!amount.trim() || isNaN(num) || num <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
        addExpense({ amount: num, type, category, note: note.trim(), date });
        setAmount(''); setType('expense'); setCategory('food'); setNote('');
        setModal(false);
    }

    function handleDelete(id: string) {
        Alert.alert('Delete', 'Remove this transaction?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
        ]);
    }

    const s = tabStyles(c);

    return (
        <View style={s.container}>
            {/* Day balance mini-card */}
            <View style={[s.balanceBar, { backgroundColor: income >= spent ? c.success : c.danger }]}>
                <Text style={s.balanceBarText}>Balance: ₹{(income - spent).toFixed(2)}</Text>
                <Text style={s.balanceBarSub}>↑₹{income.toFixed(2)}  ↓₹{spent.toFixed(2)}</Text>
            </View>

            <View style={s.subHeader}>
                <Text style={s.subTitle}>{dayExpenses.length} transactions</Text>
                <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
                    <Text style={s.addBtnText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.list}>
                {dayExpenses.length === 0 && <EmptyState emoji="💳" message="No transactions for this day" />}
                {dayExpenses.map(exp => {
                    const cat = EXPENSE_CATS.find(c => c.key === exp.category);
                    return (
                        <TouchableOpacity key={exp.id} style={s.card} onLongPress={() => handleDelete(exp.id)}>
                            <View style={[s.iconBox, { backgroundColor: exp.type === 'income' ? c.success + '22' : c.danger + '22' }]}>
                                <Text style={{ fontSize: 20 }}>{cat?.emoji}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.cardTitle}>{exp.note || cat?.label}</Text>
                                <Text style={s.cardMeta}>{cat?.label}</Text>
                            </View>
                            <Text style={{ fontSize: 16, fontWeight: '700', color: exp.type === 'income' ? c.success : c.danger }}>
                                {exp.type === 'income' ? '+' : '-'}₹{exp.amount.toFixed(2)}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <Modal visible={modal} animationType="slide" transparent>
                <View style={s.overlay}>
                    <View style={s.modal}>
                        <ModalHeader title="New Transaction" onClose={() => setModal(false)} c={c} />
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                            <TouchableOpacity style={[s.typeBtn, type === 'expense' && { backgroundColor: c.danger }]} onPress={() => setType('expense')}>
                                <Text style={[s.typeBtnText, type === 'expense' && { color: '#fff' }]}>↓ Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.typeBtn, type === 'income' && { backgroundColor: c.success }]} onPress={() => setType('income')}>
                                <Text style={[s.typeBtnText, type === 'income' && { color: '#fff' }]}>↑ Income</Text>
                            </TouchableOpacity>
                        </View>
                        <Label text="Amount (₹) *" c={c} />
                        <TextInput style={s.input} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={c.subtext} keyboardType="numeric" />
                        <Label text="Category" c={c} />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                            {EXPENSE_CATS.map(cat => (
                                <TouchableOpacity key={cat.key} style={[s.chip, category === cat.key && s.chipActive]} onPress={() => setCategory(cat.key)}>
                                    <Text style={[s.chipText, category === cat.key && { color: '#fff' }]}>{cat.emoji} {cat.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <Label text="Note (optional)" c={c} />
                        <TextInput style={s.input} value={note} onChangeText={setNote} placeholder="What was this for?" placeholderTextColor={c.subtext} />
                        <TouchableOpacity style={[s.saveBtn, { backgroundColor: type === 'income' ? c.success : c.danger }]} onPress={handleAdd}>
                            <Text style={s.saveBtnText}>Save Transaction</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ─── Events Tab ───────────────────────────────────────────────────────────────

function EventsTab({ date, c, diary }: { date: string; c: (typeof Colors)['light']; diary: ReturnType<typeof useDiary> }) {
    const { events, addEvent, updateEvent, deleteEvent } = diary;
    const dayEvents = useMemo(
        () => events.filter(e => e.date === date).sort((a, b) => a.startTime.localeCompare(b.startTime)),
        [events, date],
    );

    const [modal, setModal] = useState(false);
    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<EventType>('work');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [location, setLocation] = useState('');
    const [note, setNote] = useState('');

    const [editModal, setEditModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<typeof dayEvents[0] | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editEventType, setEditEventType] = useState<EventType>('work');
    const [editStartTime, setEditStartTime] = useState('09:00');
    const [editEndTime, setEditEndTime] = useState('10:00');
    const [editLocation, setEditLocation] = useState('');
    const [editNote, setEditNote] = useState('');

    function handleAdd() {
        if (!title.trim()) { Alert.alert('Error', 'Event title is required'); return; }
        addEvent({ title: title.trim(), date, startTime, endTime, type: eventType, note: note.trim(), location: location.trim() });
        setTitle(''); setEventType('work'); setStartTime('09:00'); setEndTime('10:00'); setLocation(''); setNote('');
        setModal(false);
    }

    function openEdit(ev: typeof dayEvents[0]) {
        setEditingEvent(ev);
        setEditTitle(ev.title);
        setEditEventType(ev.type);
        setEditStartTime(ev.startTime);
        setEditEndTime(ev.endTime);
        setEditLocation(ev.location);
        setEditNote(ev.note);
        setEditModal(true);
    }

    function handleSaveEdit() {
        if (!editingEvent) return;
        if (!editTitle.trim()) { Alert.alert('Error', 'Event title is required'); return; }
        updateEvent({
            ...editingEvent,
            title: editTitle.trim(),
            type: editEventType,
            startTime: editStartTime,
            endTime: editEndTime,
            location: editLocation.trim(),
            note: editNote.trim(),
        });
        setEditModal(false);
        setEditingEvent(null);
    }

    function handleDelete(id: string) {
        Alert.alert('Delete', 'Remove this event?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(id) },
        ]);
    }

    const s = tabStyles(c);

    return (
        <View style={s.container}>
            <View style={s.subHeader}>
                <Text style={s.subTitle}>{dayEvents.length} events scheduled</Text>
                <TouchableOpacity style={s.addBtn} onPress={() => setModal(true)}>
                    <Text style={s.addBtnText}>+ Add Event</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.list}>
                {dayEvents.length === 0 && <EmptyState emoji="📅" message="No events for this day" />}
                {dayEvents.map(ev => {
                    const et = EVENT_TYPES.find(t => t.key === ev.type);
                    const color = et?.color(c) ?? c.tint;
                    return (
                        <View key={ev.id} style={[s.card, { borderLeftWidth: 4, borderLeftColor: color }]}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ fontSize: 18 }}>{et?.emoji}</Text>
                                    <Text style={s.cardTitle}>{ev.title}</Text>
                                </View>
                                <Text style={[s.cardMeta, { marginTop: 6 }]}>⏰ {ev.startTime} – {ev.endTime}</Text>
                                {!!ev.location && <Text style={s.cardMeta}>📍 {ev.location}</Text>}
                                {!!ev.note && <Text style={s.cardMeta}>📝 {ev.note}</Text>}
                            </View>
                            <View style={{ gap: 6 }}>
                                <TouchableOpacity
                                    style={[s.iconActionBtn, { backgroundColor: c.tint + '22' }]}
                                    onPress={() => openEdit(ev)}>
                                    <Text style={{ fontSize: 14 }}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[s.iconActionBtn, { backgroundColor: c.danger + '22' }]}
                                    onPress={() => handleDelete(ev.id)}>
                                    <Text style={{ fontSize: 14 }}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>

            {/* Add Modal */}
            <Modal visible={modal} animationType="slide" transparent>
                <View style={s.overlay}>
                    <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                        <ModalHeader title="New Event" onClose={() => setModal(false)} c={c} />
                        <Label text="Title *" c={c} />
                        <TextInput style={s.input} value={title} onChangeText={setTitle} placeholder="Event title..." placeholderTextColor={c.subtext} />
                        <Label text="Type" c={c} />
                        <ChipRow
                            items={EVENT_TYPES.map(et => ({ key: et.key, label: `${et.emoji} ${et.label}` }))}
                            selected={eventType} onSelect={v => setEventType(v as EventType)} c={c} />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Label text="Start Time" c={c} />
                                <TextInput style={s.input} value={startTime} onChangeText={setStartTime} placeholder="09:00" placeholderTextColor={c.subtext} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Label text="End Time" c={c} />
                                <TextInput style={s.input} value={endTime} onChangeText={setEndTime} placeholder="10:00" placeholderTextColor={c.subtext} />
                            </View>
                        </View>
                        <Label text="Location (optional)" c={c} />
                        <TextInput style={s.input} value={location} onChangeText={setLocation} placeholder="Where?" placeholderTextColor={c.subtext} />
                        <Label text="Notes (optional)" c={c} />
                        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={note} onChangeText={setNote} placeholder="Details..." placeholderTextColor={c.subtext} multiline />
                        <TouchableOpacity style={s.saveBtn} onPress={handleAdd}>
                            <Text style={s.saveBtnText}>Save Event</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>

            {/* Edit Modal */}
            <Modal visible={editModal} animationType="slide" transparent>
                <View style={s.overlay}>
                    <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
                        <ModalHeader title="Edit Event" onClose={() => { setEditModal(false); setEditingEvent(null); }} c={c} />
                        <Label text="Title *" c={c} />
                        <TextInput style={s.input} value={editTitle} onChangeText={setEditTitle} placeholder="Event title..." placeholderTextColor={c.subtext} />
                        <Label text="Type" c={c} />
                        <ChipRow
                            items={EVENT_TYPES.map(et => ({ key: et.key, label: `${et.emoji} ${et.label}` }))}
                            selected={editEventType} onSelect={v => setEditEventType(v as EventType)} c={c} />
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Label text="Start Time" c={c} />
                                <TextInput style={s.input} value={editStartTime} onChangeText={setEditStartTime} placeholder="09:00" placeholderTextColor={c.subtext} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Label text="End Time" c={c} />
                                <TextInput style={s.input} value={editEndTime} onChangeText={setEditEndTime} placeholder="10:00" placeholderTextColor={c.subtext} />
                            </View>
                        </View>
                        <Label text="Location (optional)" c={c} />
                        <TextInput style={s.input} value={editLocation} onChangeText={setEditLocation} placeholder="Where?" placeholderTextColor={c.subtext} />
                        <Label text="Notes (optional)" c={c} />
                        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} value={editNote} onChangeText={setEditNote} placeholder="Details..." placeholderTextColor={c.subtext} multiline />
                        <TouchableOpacity style={s.saveBtn} onPress={handleSaveEdit}>
                            <Text style={s.saveBtnText}>Save Changes</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </Modal>
        </View>
    );
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function EmptyState({ emoji, message }: { emoji: string; message: string }) {
    return (
        <View style={{ paddingTop: 60, alignItems: 'center' }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>{emoji}</Text>
            <Text style={{ color: '#888', fontSize: 14 }}>{message}</Text>
        </View>
    );
}

function ModalHeader({ title, onClose, c }: { title: string; onClose: () => void; c: (typeof Colors)['light'] }) {
    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: c.text }}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Text style={{ fontSize: 22, color: c.subtext }}>✕</Text></TouchableOpacity>
        </View>
    );
}

function Label({ text, c }: { text: string; c: (typeof Colors)['light'] }) {
    return <Text style={{ fontSize: 13, fontWeight: '600', color: c.subtext, marginBottom: 8, marginTop: 12 }}>{text}</Text>;
}

function ChipRow({ items, selected, onSelect, c }: {
    items: { key: string; label: string }[];
    selected: string;
    onSelect: (v: string) => void;
    c: (typeof Colors)['light'];
}) {
    const s = tabStyles(c);
    return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {items.map(item => (
                <TouchableOpacity
                    key={item.key}
                    style={[s.chip, selected === item.key && s.chipActive]}
                    onPress={() => onSelect(item.key)}>
                    <Text style={[s.chipText, selected === item.key && { color: '#fff' }]}>{item.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function styles(c: (typeof Colors)['light']) {
    return StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.background },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
            gap: 12,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
            backgroundColor: c.card,
        },
        backBtn: {
            width: 36, height: 36,
            backgroundColor: c.background,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.border,
        },
        backArrow: { fontSize: 24, color: c.tint, fontWeight: '700', lineHeight: 28 },
        dayName: { fontSize: 13, color: c.subtext, fontWeight: '600' },
        dateText: { fontSize: 20, fontWeight: '800', color: c.text },
        tabBar: {
            flexDirection: 'row',
            backgroundColor: c.card,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
        },
        tabBtn: {
            flex: 1,
            paddingVertical: 12,
            alignItems: 'center',
            borderBottomWidth: 3,
            borderBottomColor: 'transparent',
        },
        tabBtnActive: { borderBottomColor: c.tint },
        tabLabel: { fontSize: 13, fontWeight: '600', color: c.subtext },
        tabLabelActive: { color: c.tint },
    });
}

function tabStyles(c: (typeof Colors)['light']) {
    return StyleSheet.create({
        container: { flex: 1, backgroundColor: c.background },
        subHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        subTitle: { fontSize: 13, color: c.subtext, fontWeight: '500' },
        addBtn: { backgroundColor: c.tint, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
        addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
        list: { paddingHorizontal: 16, paddingBottom: 40 },
        card: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.card,
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            gap: 12,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        },
        checkbox: {
            width: 24, height: 24, borderRadius: 12,
            borderWidth: 2, borderColor: c.tint,
            alignItems: 'center', justifyContent: 'center',
        },
        cardTitle: { fontSize: 14, fontWeight: '600', color: c.text },
        strikethrough: { textDecorationLine: 'line-through', color: c.subtext },
        cardMeta: { fontSize: 12, color: c.subtext, marginTop: 2 },
        badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
        badgeText: { fontSize: 11, fontWeight: '600' },
        iconBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
        balanceBar: {
            marginHorizontal: 16,
            marginBottom: 4,
            marginTop: 8,
            borderRadius: 14,
            padding: 14,
            alignItems: 'center',
        },
        balanceBarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
        balanceBarSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
        modal: {
            backgroundColor: c.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '90%',
        },
        input: {
            backgroundColor: c.background,
            borderRadius: 12,
            padding: 12,
            fontSize: 15,
            color: c.text,
            borderWidth: 1,
            borderColor: c.border,
        },
        chip: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: c.background,
            borderWidth: 1,
            borderColor: c.border,
        },
        chipActive: { backgroundColor: c.tint, borderColor: c.tint },
        chipText: { fontSize: 13, color: c.subtext },
        saveBtn: { backgroundColor: c.tint, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
        saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
        typeBtn: {
            flex: 1, padding: 12, borderRadius: 12,
            backgroundColor: c.background, alignItems: 'center',
            borderWidth: 1, borderColor: c.border,
        },
        typeBtnText: { fontWeight: '700', fontSize: 14, color: c.subtext },
        iconActionBtn: {
            width: 32, height: 32, borderRadius: 8,
            alignItems: 'center', justifyContent: 'center',
        },
    });
}
