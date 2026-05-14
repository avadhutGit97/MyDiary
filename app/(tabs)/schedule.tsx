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
import { EventType, useDiary } from '@/store/diary-context';

const EVENT_TYPES: { key: EventType; label: string; emoji: string; color: (c: (typeof Colors)['light']) => string }[] = [
    { key: 'work', label: 'Work', emoji: '💼', color: c => c.info },
    { key: 'meeting', label: 'Meeting', emoji: '👥', color: c => c.tint },
    { key: 'personal', label: 'Personal', emoji: '👤', color: c => c.success },
    { key: 'reminder', label: 'Reminder', emoji: '🔔', color: c => c.accent },
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function isoDate(d: Date) {
    return d.toISOString().slice(0, 10);
}

function buildWeekDates(centerDate: Date) {
    const dates: Date[] = [];
    // Show 14 days starting from 7 days before today
    const start = new Date(centerDate);
    start.setDate(start.getDate() - 7);
    for (let i = 0; i < 21; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d);
    }
    return dates;
}

export default function ScheduleScreen() {
    const colorScheme = useColorScheme();
    const c = Colors[colorScheme ?? 'light'];
    const { events, addEvent, deleteEvent } = useDiary();

    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(isoDate(today));
    const [modalVisible, setModalVisible] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [eventType, setEventType] = useState<EventType>('work');
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [location, setLocation] = useState('');
    const [note, setNote] = useState('');

    const weekDates = useMemo(() => buildWeekDates(today), []);

    const dayEvents = useMemo(
        () => events.filter(e => e.date === selectedDate).sort((a, b) => a.startTime.localeCompare(b.startTime)),
        [events, selectedDate],
    );

    function openModal() {
        setTitle('');
        setEventType('work');
        setStartTime('09:00');
        setEndTime('10:00');
        setLocation('');
        setNote('');
        setModalVisible(true);
    }

    function handleAdd() {
        if (!title.trim()) {
            Alert.alert('Error', 'Event title is required');
            return;
        }
        addEvent({
            title: title.trim(),
            date: selectedDate,
            startTime,
            endTime,
            type: eventType,
            note: note.trim(),
            location: location.trim(),
        });
        setModalVisible(false);
    }

    function handleDelete(id: string) {
        Alert.alert('Delete Event', 'Remove this event?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteEvent(id) },
        ]);
    }

    const [selY, selM, selD] = selectedDate.split('-').map(Number);
    const selDateObj = new Date(selY, selM - 1, selD);

    const s = styles(c);

    return (
        <SafeAreaView style={s.safe}>
            {/* Header */}
            <View style={s.header}>
                <View>
                    <Text style={s.title}>Schedule</Text>
                    <Text style={s.subtitle}>
                        {MONTHS[selDateObj.getMonth()]} {selD}, {selY}
                    </Text>
                </View>
                <TouchableOpacity style={s.addBtn} onPress={openModal}>
                    <Text style={s.addBtnText}>+ Add</Text>
                </TouchableOpacity>
            </View>

            {/* Horizontal date selector */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={s.dateBar}>
                {weekDates.map(d => {
                    const iso = isoDate(d);
                    const isToday = iso === isoDate(today);
                    const isSelected = iso === selectedDate;
                    const hasEvents = events.some(e => e.date === iso);
                    return (
                        <TouchableOpacity
                            key={iso}
                            style={[s.datePill, isSelected && s.datePillSelected]}
                            onPress={() => setSelectedDate(iso)}>
                            <Text style={[s.dateDayText, isSelected && s.dateDayTextSelected]}>
                                {DAYS_SHORT[d.getDay()]}
                            </Text>
                            <Text style={[s.dateNumText, isSelected && s.dateNumTextSelected]}>
                                {d.getDate()}
                            </Text>
                            {isToday && <View style={[s.todayDot, isSelected && { backgroundColor: '#fff' }]} />}
                            {hasEvents && !isToday && <View style={[s.eventDot, isSelected && { backgroundColor: 'rgba(255,255,255,0.6)' }]} />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Events for selected day */}
            <FlatList
                data={dayEvents}
                keyExtractor={item => item.id}
                contentContainerStyle={s.list}
                ListEmptyComponent={
                    <View style={s.empty}>
                        <Text style={s.emptyEmoji}>📅</Text>
                        <Text style={s.emptyText}>No events scheduled.</Text>
                        <Text style={s.emptyHint}>Tap "+ Add" to create one!</Text>
                    </View>
                }
                renderItem={({ item }) => {
                    const et = EVENT_TYPES.find(t => t.key === item.type);
                    const color = et?.color(c) ?? c.tint;
                    return (
                        <TouchableOpacity
                            style={[s.eventCard, { borderLeftColor: color }]}
                            onLongPress={() => handleDelete(item.id)}>
                            <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Text style={{ fontSize: 16 }}>{et?.emoji}</Text>
                                    <Text style={s.eventTitle}>{item.title}</Text>
                                </View>
                                <View style={s.eventMeta}>
                                    <Text style={s.eventMetaText}>⏰ {item.startTime} – {item.endTime}</Text>
                                    {!!item.location && <Text style={s.eventMetaText}>📍 {item.location}</Text>}
                                    {!!item.note && <Text style={[s.eventMetaText, { marginTop: 4 }]}>{item.note}</Text>}
                                </View>
                            </View>
                            <View style={[s.typeBadge, { backgroundColor: color + '22', borderColor: color }]}>
                                <Text style={[s.typeBadgeText, { color }]}>{item.type}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                }}
            />

            {/* Add Event Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={s.overlay}>
                    <ScrollView style={s.modal} contentContainerStyle={{ paddingBottom: 40 }}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>New Event</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={{ fontSize: 22, color: c.subtext }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={s.label}>Title *</Text>
                        <TextInput
                            style={s.input}
                            value={title}
                            onChangeText={setTitle}
                            placeholder="Event title"
                            placeholderTextColor={c.subtext}
                        />

                        <Text style={s.label}>Type</Text>
                        <View style={s.chipRow}>
                            {EVENT_TYPES.map(et => (
                                <TouchableOpacity
                                    key={et.key}
                                    style={[s.chip, eventType === et.key && { backgroundColor: et.color(c), borderColor: et.color(c) }]}
                                    onPress={() => setEventType(et.key)}>
                                    <Text style={[s.chipText, eventType === et.key && { color: '#fff' }]}>
                                        {et.emoji} {et.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={s.label}>Date</Text>
                        <TextInput
                            style={s.input}
                            value={selectedDate}
                            onChangeText={v => { }}
                            editable={false}
                            placeholderTextColor={c.subtext}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.label}>Start Time</Text>
                                <TextInput
                                    style={s.input}
                                    value={startTime}
                                    onChangeText={setStartTime}
                                    placeholder="09:00"
                                    placeholderTextColor={c.subtext}
                                />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={s.label}>End Time</Text>
                                <TextInput
                                    style={s.input}
                                    value={endTime}
                                    onChangeText={setEndTime}
                                    placeholder="10:00"
                                    placeholderTextColor={c.subtext}
                                />
                            </View>
                        </View>

                        <Text style={s.label}>Location (optional)</Text>
                        <TextInput
                            style={s.input}
                            value={location}
                            onChangeText={setLocation}
                            placeholder="Meeting room, address..."
                            placeholderTextColor={c.subtext}
                        />

                        <Text style={s.label}>Notes</Text>
                        <TextInput
                            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
                            value={note}
                            onChangeText={setNote}
                            placeholder="Agenda, meeting notes..."
                            placeholderTextColor={c.subtext}
                            multiline
                        />

                        <TouchableOpacity style={s.saveBtn} onPress={handleAdd}>
                            <Text style={s.saveBtnText}>Save Event</Text>
                        </TouchableOpacity>
                    </ScrollView>
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
        subtitle: { fontSize: 13, color: c.subtext, marginTop: 2 },
        addBtn: { backgroundColor: c.tint, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
        addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
        dateBar: { paddingHorizontal: 12, paddingVertical: 12, gap: 8 },
        datePill: {
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 10,
            borderRadius: 14,
            backgroundColor: c.card,
            minWidth: 50,
            borderWidth: 1,
            borderColor: c.border,
        },
        datePillSelected: { backgroundColor: c.tint, borderColor: c.tint },
        dateDayText: { fontSize: 11, color: c.subtext, fontWeight: '600' },
        dateDayTextSelected: { color: 'rgba(255,255,255,0.8)' },
        dateNumText: { fontSize: 18, fontWeight: '800', color: c.text, marginTop: 2 },
        dateNumTextSelected: { color: '#fff' },
        todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.tint, marginTop: 4 },
        eventDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginTop: 4 },
        list: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30 },
        eventCard: {
            flexDirection: 'row',
            alignItems: 'flex-start',
            backgroundColor: c.card,
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            borderLeftWidth: 4,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 2,
        },
        eventTitle: { fontSize: 15, fontWeight: '700', color: c.text, flex: 1 },
        eventMeta: { marginTop: 8, gap: 4 },
        eventMetaText: { fontSize: 13, color: c.subtext },
        typeBadge: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 10,
            borderWidth: 1,
            marginLeft: 8,
        },
        typeBadgeText: { fontSize: 11, fontWeight: '700' },
        empty: { paddingTop: 60, alignItems: 'center' },
        emptyEmoji: { fontSize: 40, marginBottom: 12 },
        emptyText: { color: c.subtext, fontSize: 15, fontWeight: '600' },
        emptyHint: { color: c.subtext, fontSize: 13, marginTop: 6 },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
        modal: {
            backgroundColor: c.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            maxHeight: '90%',
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
        chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
        chip: {
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: c.background,
            borderWidth: 1,
            borderColor: c.border,
        },
        chipText: { fontSize: 13, color: c.subtext },
        saveBtn: { backgroundColor: c.tint, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
        saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    });
}
