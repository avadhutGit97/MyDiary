import React, { useMemo, useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Priority, TodoCategory, useDiary } from '@/store/diary-context';

const CATEGORIES: { key: TodoCategory; label: string; emoji: string }[] = [
    { key: 'work', label: 'Work', emoji: '💼' },
    { key: 'personal', label: 'Personal', emoji: '👤' },
    { key: 'shopping', label: 'Shopping', emoji: '🛒' },
    { key: 'health', label: 'Health', emoji: '❤️' },
    { key: 'other', label: 'Other', emoji: '📌' },
];

const PRIORITIES: { key: Priority; label: string }[] = [
    { key: 'high', label: '🔴 High' },
    { key: 'medium', label: '🟡 Medium' },
    { key: 'low', label: '🟢 Low' },
];

const FILTERS = ['All', 'Active', 'Done', 'Work', 'Personal', 'Shopping', 'Health', 'Other'] as const;

export default function TodoScreen() {
    const colorScheme = useColorScheme();
    const c = Colors[colorScheme ?? 'light'];
    const { todos, addTodo, toggleTodo, deleteTodo } = useDiary();

    const [filter, setFilter] = useState<(typeof FILTERS)[number]>('All');
    const [modalVisible, setModalVisible] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState<TodoCategory>('personal');
    const [priority, setPriority] = useState<Priority>('medium');
    const [dueDate, setDueDate] = useState('');

    const filtered = useMemo(() => {
        return todos.filter(t => {
            if (filter === 'Active') return !t.completed;
            if (filter === 'Done') return t.completed;
            if (filter === 'All') return true;
            return t.category === filter.toLowerCase();
        });
    }, [todos, filter]);

    const pending = todos.filter(t => !t.completed).length;

    function openModal() {
        setTitle('');
        setCategory('personal');
        setPriority('medium');
        setDueDate('');
        setModalVisible(true);
    }

    function handleAdd() {
        if (!title.trim()) {
            Alert.alert('Error', 'Task title is required');
            return;
        }
        addTodo({
            title: title.trim(),
            completed: false,
            category,
            priority,
            dueDate: dueDate || undefined,
        });
        setModalVisible(false);
    }

    function handleDelete(id: string) {
        Alert.alert('Delete Task', 'Are you sure you want to delete this task?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteTodo(id) },
        ]);
    }

    const s = styles(c);

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <View>
                    <Text style={s.title}>To-Do List</Text>
                    <Text style={s.subtitle}>{pending} task{pending !== 1 ? 's' : ''} pending</Text>
                </View>
                <TouchableOpacity style={s.addBtn} onPress={openModal}>
                    <Text style={s.addBtnText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            {/* Filter bar */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.filterBar}>
                {FILTERS.map(f => (
                    <TouchableOpacity
                        key={f}
                        style={[s.filterChip, filter === f && s.filterChipActive]}
                        onPress={() => setFilter(f)}>
                        <Text style={[s.filterChipText, filter === f && s.filterChipTextActive]}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Task List */}
            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                contentContainerStyle={s.list}
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyText}>No tasks here. Add one!</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const cat = CATEGORIES.find(c => c.key === item.category);
                    const priorityColor = item.priority === 'high' ? c.danger : item.priority === 'medium' ? c.accent : c.success;
                    return (
                        <TouchableOpacity
                            style={[s.card, item.completed && s.cardDone]}
                            onPress={() => toggleTodo(item.id)}
                            onLongPress={() => handleDelete(item.id)}>
                            <View style={[s.checkbox, item.completed && { backgroundColor: c.tint, borderColor: c.tint }]}>
                                {item.completed && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[s.taskTitle, item.completed && s.taskDone]}>{item.title}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                                    <Text style={s.taskMeta}>{cat?.emoji} {cat?.label}</Text>
                                    <View style={[s.priorityBadge, { backgroundColor: priorityColor + '22', borderColor: priorityColor }]}>
                                        <Text style={[s.priorityText, { color: priorityColor }]}>{item.priority}</Text>
                                    </View>
                                    {item.dueDate && <Text style={s.taskMeta}>📅 {item.dueDate}</Text>}
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => handleDelete(item.id)} style={s.deleteBtn}>
                                <Text style={{ color: c.danger, fontSize: 16 }}>✕</Text>
                            </TouchableOpacity>
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Add Task Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={s.overlay}>
                    <View style={s.modal}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>New Task</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={{ fontSize: 22, color: c.subtext }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={s.label}>Title *</Text>
                        <TextInput
                            style={s.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="What needs to be done?"
                            placeholderTextColor={c.subtext}
                        />

                        <Text style={s.label}>Category</Text>
                        <View style={s.chipRow}>
                            {CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[s.chip, category === cat.key && s.chipActive]}
                                    onPress={() => setCategory(cat.key)}>
                                    <Text style={[s.chipText, category === cat.key && s.chipTextActive]}>
                                        {cat.emoji} {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.label}>Priority</Text>
                        <View style={s.chipRow}>
                            {PRIORITIES.map(p => (
                                <TouchableOpacity
                                    key={p.key}
                                    style={[s.chip, priority === p.key && s.chipActive]}
                                    onPress={() => setPriority(p.key)}>
                                    <Text style={[s.chipText, priority === p.key && s.chipTextActive]}>{p.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.label}>Due Date (optional)</Text>
                        <TextInput
                            style={s.input}
                            value={dueDate}
                            onChangeText={setDueDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={c.subtext}
                        />

                        <TouchableOpacity style={s.saveBtn} onPress={handleAdd}>
                            <Text style={s.saveBtnText}>Add Task</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function styles(c: (typeof Colors)['light']) {
    return StyleSheet.create({
        safe: { flex: 1, backgroundColor: c.background },
        header: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: 16,
            paddingBottom: 12,
        },
        title: { fontSize: 24, fontWeight: '800', color: c.text },
        subtitle: { fontSize: 13, color: c.subtext, marginTop: 2 },
        addBtn: {
            backgroundColor: c.tint,
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: 20,
        },
        addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
        filterBar: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
        filterChip: {
            paddingHorizontal: 14,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: c.card,
            borderWidth: 1,
            borderColor: c.border,
        },
        filterChipActive: { backgroundColor: c.tint, borderColor: c.tint },
        filterChipText: { fontSize: 13, color: c.subtext, fontWeight: '500' },
        filterChipTextActive: { color: '#fff' },
        list: { paddingHorizontal: 16, paddingBottom: 30 },
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
        cardDone: { opacity: 0.6 },
        checkbox: {
            width: 24,
            height: 24,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: c.tint,
            alignItems: 'center',
            justifyContent: 'center',
        },
        taskTitle: { fontSize: 15, fontWeight: '600', color: c.text },
        taskDone: { textDecorationLine: 'line-through', color: c.subtext },
        taskMeta: { fontSize: 12, color: c.subtext },
        priorityBadge: {
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 8,
            borderWidth: 1,
        },
        priorityText: { fontSize: 11, fontWeight: '600' },
        deleteBtn: { padding: 4 },
        empty: { paddingTop: 60, alignItems: 'center' },
        emptyText: { color: c.subtext, fontSize: 15 },
        // Modal
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
        modal: {
            backgroundColor: c.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
        },
        modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
        modalTitle: { fontSize: 20, fontWeight: '800', color: c.text },
        label: { fontSize: 13, fontWeight: '600', color: c.subtext, marginBottom: 8, marginTop: 12 },
        input: {
            backgroundColor: c.background,
            borderRadius: 12,
            padding: 12,
            fontSize: 15,
            color: c.text,
            borderWidth: 1,
            borderColor: c.border,
        },
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
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
        chipTextActive: { color: '#fff', fontWeight: '600' },
        saveBtn: {
            backgroundColor: c.tint,
            borderRadius: 14,
            padding: 16,
            alignItems: 'center',
            marginTop: 24,
        },
        saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    });
}
