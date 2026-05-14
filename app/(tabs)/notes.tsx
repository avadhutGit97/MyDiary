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
import { Mood, useDiary } from '@/store/diary-context';

const MOODS: { key: Mood; emoji: string; label: string }[] = [
    { key: 'great', emoji: '😄', label: 'Great' },
    { key: 'good', emoji: '😊', label: 'Good' },
    { key: 'okay', emoji: '😐', label: 'Okay' },
    { key: 'bad', emoji: '😔', label: 'Bad' },
    { key: 'terrible', emoji: '😢', label: 'Terrible' },
];

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDate(iso: string) {
    const [y, m, d] = iso.split('-');
    return `${MONTHS[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

export default function NotesScreen() {
    const colorScheme = useColorScheme();
    const c = Colors[colorScheme ?? 'light'];
    const { entries, addEntry, updateEntry, deleteEntry } = useDiary();

    const [search, setSearch] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [editingEntry, setEditingEntry] = useState<null | (typeof entries)[0]>(null);

    // Form state
    const [entryTitle, setEntryTitle] = useState('');
    const [content, setContent] = useState('');
    const [mood, setMood] = useState<Mood | undefined>(undefined);
    const [tags, setTags] = useState('');
    const [entryDate, setEntryDate] = useState(todayIso());

    const filtered = useMemo(() => {
        if (!search.trim()) return entries;
        const q = search.toLowerCase();
        return entries.filter(
            e =>
                e.title.toLowerCase().includes(q) ||
                e.content.toLowerCase().includes(q) ||
                e.tags.some(t => t.toLowerCase().includes(q)),
        );
    }, [entries, search]);

    function openNewModal() {
        setEditingEntry(null);
        setEntryTitle('');
        setContent('');
        setMood(undefined);
        setTags('');
        setEntryDate(todayIso());
        setModalVisible(true);
    }

    function openEditModal(entry: (typeof entries)[0]) {
        setEditingEntry(entry);
        setEntryTitle(entry.title);
        setContent(entry.content);
        setMood(entry.mood);
        setTags(entry.tags.join(', '));
        setEntryDate(entry.date);
        setModalVisible(true);
    }

    function handleSave() {
        if (!entryTitle.trim()) {
            Alert.alert('Error', 'Title is required');
            return;
        }
        if (!content.trim()) {
            Alert.alert('Error', 'Content is required');
            return;
        }
        const tagList = tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);

        if (editingEntry) {
            updateEntry({
                ...editingEntry,
                title: entryTitle.trim(),
                content: content.trim(),
                mood,
                tags: tagList,
                date: entryDate,
            });
        } else {
            addEntry({
                title: entryTitle.trim(),
                content: content.trim(),
                mood,
                tags: tagList,
                date: entryDate,
            });
        }
        setModalVisible(false);
    }

    function handleDelete(id: string) {
        Alert.alert('Delete Entry', 'Remove this diary entry?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(id) },
        ]);
    }

    const s = styles(c);

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <Text style={s.title}>My Diary</Text>
                <TouchableOpacity style={s.addBtn} onPress={openNewModal}>
                    <Text style={s.addBtnText}>+ Write</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={s.searchRow}>
                <TextInput
                    style={s.searchInput}
                    value={search}
                    onChangeText={setSearch}
                    placeholder="Search entries..."
                    placeholderTextColor={c.subtext}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} style={s.clearBtn}>
                        <Text style={{ color: c.subtext, fontSize: 16 }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Stats bar */}
            <View style={s.statsBar}>
                <Text style={s.statText}>{entries.length} entries</Text>
                <Text style={s.statDot}>•</Text>
                <Text style={s.statText}>
                    {entries.filter(e => e.date === todayIso()).length} today
                </Text>
                <Text style={s.statDot}>•</Text>
                <Text style={s.statText}>{[...new Set(entries.map(e => e.date))].length} days written</Text>
            </View>

            {/* Entry List */}
            <FlatList
                data={filtered}
                keyExtractor={item => item.id}
                contentContainerStyle={s.list}
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyEmoji}>📖</Text>
                        <Text style={s.emptyText}>
                            {search ? 'No entries found.' : 'Start your diary journey!'}
                        </Text>
                        {!search && (
                            <TouchableOpacity style={s.emptyBtn} onPress={openNewModal}>
                                <Text style={s.emptyBtnText}>Write First Entry</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
                renderItem={({ item }) => {
                    const moodObj = MOODS.find(m => m.key === item.mood);
                    return (
                        <TouchableOpacity style={s.card} onPress={() => openEditModal(item)} onLongPress={() => handleDelete(item.id)}>
                            <View style={s.cardHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
                                    <Text style={s.cardDate}>{formatDate(item.date)}</Text>
                                </View>
                                {moodObj && (
                                    <View style={s.moodBadge}>
                                        <Text style={{ fontSize: 20 }}>{moodObj.emoji}</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={s.cardContent} numberOfLines={3}>{item.content}</Text>
                            {item.tags.length > 0 && (
                                <View style={s.tagRow}>
                                    {item.tags.slice(0, 4).map((tag, i) => (
                                        <View key={i} style={s.tag}>
                                            <Text style={s.tagText}>#{tag}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Write/Edit Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={s.overlay}>
                    <View style={s.modal}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>{editingEntry ? 'Edit Entry' : 'New Entry'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={{ fontSize: 22, color: c.subtext }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
                            <Text style={s.label}>Title *</Text>
                            <TextInput
                                style={s.input}
                                value={entryTitle}
                                onChangeText={setEntryTitle}
                                placeholder="Entry title..."
                                placeholderTextColor={c.subtext}
                            />

                            <Text style={s.label}>How are you feeling?</Text>
                            <View style={s.moodRow}>
                                {MOODS.map(m => (
                                    <TouchableOpacity
                                        key={m.key}
                                        style={[s.moodBtn, mood === m.key && { backgroundColor: c.tint + '33', borderColor: c.tint }]}
                                        onPress={() => setMood(prev => (prev === m.key ? undefined : m.key))}>
                                        <Text style={{ fontSize: 24 }}>{m.emoji}</Text>
                                        <Text style={[s.moodLabel, mood === m.key && { color: c.tint }]}>{m.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={s.label}>Content *</Text>
                            <TextInput
                                style={[s.input, s.textArea]}
                                value={content}
                                onChangeText={setContent}
                                placeholder="Write your thoughts, notes, meetings..."
                                placeholderTextColor={c.subtext}
                                multiline
                                textAlignVertical="top"
                            />

                            <Text style={s.label}>Tags (comma-separated)</Text>
                            <TextInput
                                style={s.input}
                                value={tags}
                                onChangeText={setTags}
                                placeholder="work, ideas, meeting, personal..."
                                placeholderTextColor={c.subtext}
                            />

                            <Text style={s.label}>Date</Text>
                            <TextInput
                                style={s.input}
                                value={entryDate}
                                onChangeText={setEntryDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={c.subtext}
                            />

                            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
                                <Text style={s.saveBtnText}>{editingEntry ? 'Update Entry' : 'Save Entry'}</Text>
                            </TouchableOpacity>
                        </ScrollView>
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
            paddingBottom: 8,
        },
        title: { fontSize: 24, fontWeight: '800', color: c.text },
        addBtn: { backgroundColor: c.tint, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
        addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
        searchRow: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.card,
            marginHorizontal: 16,
            borderRadius: 14,
            paddingHorizontal: 14,
            borderWidth: 1,
            borderColor: c.border,
            marginBottom: 12,
        },
        searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: c.text },
        clearBtn: { padding: 4 },
        statsBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
        statText: { fontSize: 13, color: c.subtext, fontWeight: '500' },
        statDot: { color: c.border, fontSize: 13 },
        list: { paddingHorizontal: 16, paddingBottom: 30 },
        card: {
            backgroundColor: c.card,
            borderRadius: 16,
            padding: 16,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOpacity: 0.06,
            shadowRadius: 6,
            elevation: 2,
        },
        cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
        cardTitle: { fontSize: 16, fontWeight: '700', color: c.text },
        cardDate: { fontSize: 12, color: c.tint, marginTop: 3, fontWeight: '600' },
        moodBadge: { marginLeft: 8 },
        cardContent: { fontSize: 14, color: c.subtext, lineHeight: 20 },
        tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
        tag: {
            backgroundColor: c.tint + '18',
            borderRadius: 10,
            paddingHorizontal: 8,
            paddingVertical: 3,
        },
        tagText: { fontSize: 11, color: c.tint, fontWeight: '600' },
        empty: { paddingTop: 60, alignItems: 'center' },
        emptyEmoji: { fontSize: 48, marginBottom: 12 },
        emptyText: { color: c.subtext, fontSize: 15, fontWeight: '600' },
        emptyBtn: { marginTop: 16, backgroundColor: c.tint, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
        emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
        // Modal
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
        modal: {
            backgroundColor: c.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '92%',
        },
        modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
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
        textArea: { height: 140 },
        moodRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
        moodBtn: {
            flex: 1,
            alignItems: 'center',
            paddingVertical: 10,
            borderRadius: 14,
            backgroundColor: c.background,
            borderWidth: 1,
            borderColor: c.border,
        },
        moodLabel: { fontSize: 10, color: c.subtext, marginTop: 4, fontWeight: '600' },
        saveBtn: { backgroundColor: c.tint, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
        saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    });
}
