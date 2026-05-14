import React, { useMemo, useState } from 'react';
import {
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ExpenseCategory, useDiary } from '@/store/diary-context';

const EXPENSE_CATEGORIES: { key: ExpenseCategory; label: string; emoji: string }[] = [
    { key: 'food', label: 'Food', emoji: '🍔' },
    { key: 'transport', label: 'Transport', emoji: '🚗' },
    { key: 'shopping', label: 'Shopping', emoji: '🛍️' },
    { key: 'entertainment', label: 'Entertainment', emoji: '🎬' },
    { key: 'health', label: 'Health', emoji: '💊' },
    { key: 'bills', label: 'Bills', emoji: '📄' },
    { key: 'salary', label: 'Salary', emoji: '💰' },
    { key: 'other', label: 'Other', emoji: '📦' },
];

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function todayIso() {
    return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(iso: string) {
    const [y, m, d] = iso.split('-');
    return `${MONTHS[parseInt(m) - 1]} ${parseInt(d)}, ${y}`;
}

export default function ExpensesScreen() {
    const colorScheme = useColorScheme();
    const c = Colors[colorScheme ?? 'light'];
    const { expenses, addExpense, deleteExpense } = useDiary();

    const [modalVisible, setModalVisible] = useState(false);
    const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');

    // Form state
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [category, setCategory] = useState<ExpenseCategory>('food');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(todayIso());

    const totalIncome = useMemo(() => expenses.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0), [expenses]);
    const totalExpense = useMemo(() => expenses.filter(e => e.type === 'expense').reduce((s, e) => s + e.amount, 0), [expenses]);
    const balance = totalIncome - totalExpense;

    const filtered = useMemo(() => {
        const list = filterType === 'all' ? expenses : expenses.filter(e => e.type === filterType);
        // Group by date
        const groups: Record<string, typeof expenses> = {};
        list.forEach(e => {
            if (!groups[e.date]) groups[e.date] = [];
            groups[e.date].push(e);
        });
        return Object.entries(groups)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, items]) => ({ date, items }));
    }, [expenses, filterType]);

    function openModal() {
        setAmount('');
        setType('expense');
        setCategory('food');
        setNote('');
        setDate(todayIso());
        setModalVisible(true);
    }

    function handleAdd() {
        const num = parseFloat(amount);
        if (!amount.trim() || isNaN(num) || num <= 0) {
            Alert.alert('Error', 'Enter a valid amount');
            return;
        }
        addExpense({ amount: num, type, category, note: note.trim(), date });
        setModalVisible(false);
    }

    function handleDelete(id: string) {
        Alert.alert('Delete', 'Remove this transaction?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => deleteExpense(id) },
        ]);
    }

    const s = styles(c);

    return (
        <SafeAreaView style={s.safe}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={s.header}>
                    <Text style={s.title}>Expenses</Text>
                    <TouchableOpacity style={s.addBtn} onPress={openModal}>
                        <Text style={s.addBtnText}>+ Add</Text>
                    </TouchableOpacity>
                </View>

                {/* Balance Card */}
                <View style={[s.balanceCard, { backgroundColor: balance >= 0 ? c.tint : c.danger }]}>
                    <Text style={s.balanceLabel}>Net Balance</Text>
                    <Text style={s.balanceAmount}>₹{balance.toFixed(2)}</Text>
                    <View style={s.balanceRow}>
                        <View style={s.balanceStat}>
                            <Text style={s.balanceStatLabel}>↑ Income</Text>
                            <Text style={s.balanceStatValue}>₹{totalIncome.toFixed(2)}</Text>
                        </View>
                        <View style={[s.balanceDivider]} />
                        <View style={s.balanceStat}>
                            <Text style={s.balanceStatLabel}>↓ Expenses</Text>
                            <Text style={s.balanceStatValue}>₹{totalExpense.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Filter */}
                <View style={s.filterRow}>
                    {(['all', 'income', 'expense'] as const).map(f => (
                        <TouchableOpacity
                            key={f}
                            style={[s.filterBtn, filterType === f && s.filterBtnActive]}
                            onPress={() => setFilterType(f)}>
                            <Text style={[s.filterBtnText, filterType === f && s.filterBtnTextActive]}>
                                {f.charAt(0).toUpperCase() + f.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Transactions */}
                {filtered.length === 0 ? (
                    <View style={s.empty}>
                        <Text style={s.emptyText}>No transactions yet. Add one!</Text>
                    </View>
                ) : (
                    filtered.map(({ date, items }) => (
                        <View key={date}>
                            <Text style={s.dateHeader}>{formatDisplayDate(date)}</Text>
                            {items.map(item => {
                                const cat = EXPENSE_CATEGORIES.find(c => c.key === item.category);
                                return (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={s.txCard}
                                        onLongPress={() => handleDelete(item.id)}>
                                        <View style={[s.txIcon, { backgroundColor: item.type === 'income' ? c.success + '22' : c.danger + '22' }]}>
                                            <Text style={{ fontSize: 18 }}>{cat?.emoji}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.txNote}>{item.note || cat?.label}</Text>
                                            <Text style={s.txCat}>{cat?.label}</Text>
                                        </View>
                                        <Text style={[s.txAmount, { color: item.type === 'income' ? c.success : c.danger }]}>
                                            {item.type === 'income' ? '+' : '-'}₹{item.amount.toFixed(2)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ))
                )}
                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Add Expense Modal */}
            <Modal visible={modalVisible} animationType="slide" transparent>
                <View style={s.overlay}>
                    <View style={s.modal}>
                        <View style={s.modalHeader}>
                            <Text style={s.modalTitle}>New Transaction</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={{ fontSize: 22, color: c.subtext }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Type toggle */}
                        <View style={s.typeRow}>
                            <TouchableOpacity
                                style={[s.typeBtn, type === 'expense' && { backgroundColor: c.danger }]}
                                onPress={() => setType('expense')}>
                                <Text style={[s.typeBtnText, type === 'expense' && { color: '#fff' }]}>↓ Expense</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[s.typeBtn, type === 'income' && { backgroundColor: c.success }]}
                                onPress={() => setType('income')}>
                                <Text style={[s.typeBtnText, type === 'income' && { color: '#fff' }]}>↑ Income</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={s.label}>Amount (₹) *</Text>
                        <TextInput
                            style={s.input}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder="0.00"
                            placeholderTextColor={c.subtext}
                            keyboardType="numeric"
                        />

                        <Text style={s.label}>Category</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 4 }}>
                            {EXPENSE_CATEGORIES.map(cat => (
                                <TouchableOpacity
                                    key={cat.key}
                                    style={[s.chip, category === cat.key && s.chipActive]}
                                    onPress={() => setCategory(cat.key)}>
                                    <Text style={[s.chipText, category === cat.key && s.chipTextActive]}>
                                        {cat.emoji} {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={s.label}>Note</Text>
                        <TextInput
                            style={s.input}
                            value={note}
                            onChangeText={setNote}
                            placeholder="Optional note..."
                            placeholderTextColor={c.subtext}
                        />

                        <Text style={s.label}>Date</Text>
                        <TextInput
                            style={s.input}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={c.subtext}
                        />

                        <TouchableOpacity style={[s.saveBtn, { backgroundColor: type === 'income' ? c.success : c.danger }]} onPress={handleAdd}>
                            <Text style={s.saveBtnText}>Save Transaction</Text>
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
        addBtn: { backgroundColor: c.tint, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
        addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
        balanceCard: {
            marginHorizontal: 16,
            borderRadius: 20,
            padding: 20,
            marginBottom: 16,
        },
        balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' },
        balanceAmount: { color: '#fff', fontSize: 36, fontWeight: '800', marginTop: 4 },
        balanceRow: { flexDirection: 'row', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)' },
        balanceStat: { flex: 1, alignItems: 'center' },
        balanceDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
        balanceStatLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12 },
        balanceStatValue: { color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 4 },
        filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
        filterBtn: {
            flex: 1,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor: c.card,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: c.border,
        },
        filterBtnActive: { backgroundColor: c.tint, borderColor: c.tint },
        filterBtnText: { fontSize: 13, fontWeight: '600', color: c.subtext },
        filterBtnTextActive: { color: '#fff' },
        dateHeader: { fontSize: 12, fontWeight: '700', color: c.subtext, paddingHorizontal: 16, marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
        txCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.card,
            marginHorizontal: 16,
            borderRadius: 14,
            padding: 14,
            marginBottom: 8,
            gap: 12,
            shadowColor: '#000',
            shadowOpacity: 0.04,
            shadowRadius: 3,
            elevation: 1,
        },
        txIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
        txNote: { fontSize: 14, fontWeight: '600', color: c.text },
        txCat: { fontSize: 12, color: c.subtext, marginTop: 2 },
        txAmount: { fontSize: 15, fontWeight: '700' },
        empty: { paddingTop: 60, alignItems: 'center' },
        emptyText: { color: c.subtext, fontSize: 15 },
        overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
        modal: {
            backgroundColor: c.card,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 24,
            paddingBottom: 40,
        },
        modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
        modalTitle: { fontSize: 20, fontWeight: '800', color: c.text },
        typeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
        typeBtn: {
            flex: 1,
            padding: 12,
            borderRadius: 12,
            backgroundColor: c.background,
            alignItems: 'center',
            borderWidth: 1,
            borderColor: c.border,
        },
        typeBtnText: { fontWeight: '700', fontSize: 14, color: c.subtext },
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
        saveBtn: { backgroundColor: c.tint, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 20 },
        saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    });
}
