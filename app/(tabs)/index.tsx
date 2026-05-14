import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
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
import { useDiary } from '@/store/diary-context';

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function todayIso() {
  const d = new Date();
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function CalendarScreen() {
  const colorScheme = useColorScheme();
  const c = Colors[colorScheme ?? 'light'];
  const router = useRouter();
  const { todos, expenses, events, budgetLimits, setBudgetLimits } = useDiary();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { days, startOffset } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { days: daysInMonth, startOffset: firstDay };
  }, [year, month]);

  const activityMap = useMemo(() => {
    const map: Record<string, { todos: number; expenses: number; events: number }> = {};
    todos.forEach(t => {
      if (!t.dueDate) return;
      if (!map[t.dueDate]) map[t.dueDate] = { todos: 0, expenses: 0, events: 0 };
      map[t.dueDate].todos++;
    });
    expenses.forEach(e => {
      if (!map[e.date]) map[e.date] = { todos: 0, expenses: 0, events: 0 };
      map[e.date].expenses++;
    });
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = { todos: 0, expenses: 0, events: 0 };
      map[e.date].events++;
    });
    return map;
  }, [todos, expenses, events]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const todayString = todayIso();
  const s = styles(c);

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.appTitle}>My Diary</Text>
          <Text style={s.appSub}>Tap a date to view or add entries</Text>
        </View>

        <View style={s.monthNav}>
          <TouchableOpacity style={s.navBtn} onPress={prevMonth}>
            <Text style={s.navArrow}>&#x2039;</Text>
          </TouchableOpacity>
          <Text style={s.monthLabel}>{MONTHS_FULL[month]} {year}</Text>
          <TouchableOpacity style={s.navBtn} onPress={nextMonth}>
            <Text style={s.navArrow}>&#x203a;</Text>
          </TouchableOpacity>
        </View>

        <View style={s.weekRow}>
          {DAYS_SHORT.map(d => (
            <Text key={d} style={s.weekLabel}>{d}</Text>
          ))}
        </View>

        <View style={s.grid}>
          {cells.map((day, idx) => {
            if (day === null) return <View key={`e-${idx}`} style={s.cell} />;
            const iso = isoDate(year, month, day);
            const isToday = iso === todayString;
            const activity = activityMap[iso];
            const hasActivity = activity && (activity.todos + activity.expenses + activity.events) > 0;
            return (
              <TouchableOpacity
                key={iso}
                style={[s.cell, isToday && s.todayCell]}
                onPress={() => router.push(`/day/${iso}`)}>
                <Text style={[s.dayText, isToday && s.todayText]}>{day}</Text>
                {hasActivity && (
                  <View style={s.dotsRow}>
                    {activity.todos > 0 && <View style={[s.dot, { backgroundColor: c.tint }]} />}
                    {activity.expenses > 0 && <View style={[s.dot, { backgroundColor: c.success }]} />}
                    {activity.events > 0 && <View style={[s.dot, { backgroundColor: c.accent }]} />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={s.legend}>
          <LegendItem color={c.tint} label="Tasks" />
          <LegendItem color={c.success} label="Expenses" />
          <LegendItem color={c.accent} label="Events" />
        </View>

        <MonthStats year={year} month={month} todos={todos} expenses={expenses} events={events} c={c} router={router} budgetLimits={budgetLimits} setBudgetLimits={setBudgetLimits} />

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
      <Text style={{ fontSize: 12, color: '#888' }}>{label}</Text>
    </View>
  );
}

function MonthStats({ year, month, todos, expenses, events, c, router, budgetLimits, setBudgetLimits }: {
  year: number; month: number;
  todos: any[]; expenses: any[]; events: any[];
  c: (typeof Colors)['light'];
  router: ReturnType<typeof useRouter>;
  budgetLimits: { dailyLimit?: number; monthlyLimit?: number };
  setBudgetLimits: (l: { dailyLimit?: number; monthlyLimit?: number }) => void;
}) {
  const [taskModal, setTaskModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);
  const [budgetModal, setBudgetModal] = useState(false);
  const [todayEventsModal, setTodayEventsModal] = useState(false);
  const [dailyInput, setDailyInput] = useState('');
  const [monthlyInput, setMonthlyInput] = useState('');

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const monthTodos = todos.filter(t => t.dueDate?.startsWith(prefix) && !t.completed);
  const monthExpenses = expenses.filter(e => e.date.startsWith(prefix));
  const monthEvents = events.filter(e => e.date.startsWith(prefix)).length;
  const todayEvents = events.filter(e => e.date === todayStr).sort((a: any, b: any) => a.startTime.localeCompare(b.startTime));

  const income = monthExpenses.filter(e => e.type === 'income').reduce((s: number, e: any) => s + e.amount, 0);
  const spent = monthExpenses.filter(e => e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0);

  // Pro-rated monthly budget color
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const isPastMonth = year < today.getFullYear() || (year === today.getFullYear() && month < today.getMonth());
  const daysElapsed = isCurrentMonth ? today.getDate() : isPastMonth ? daysInMonth : 0;

  const { monthlyLimit, dailyLimit } = budgetLimits;
  let balanceColor = income >= spent ? c.success : c.danger;
  let budgetStatus = income >= spent ? 'Surplus' : 'Deficit';
  if (monthlyLimit && monthlyLimit > 0 && daysElapsed > 0) {
    const pace = (monthlyLimit / daysInMonth) * daysElapsed;
    if (spent > pace) { balanceColor = c.danger; budgetStatus = 'Over pace 🔴'; }
    else if (spent > pace * 0.8) { balanceColor = '#F59E0B'; budgetStatus = 'Near pace 🟡'; }
    else { balanceColor = c.success; budgetStatus = 'On track 🟢'; }
  }

  // Today's spending vs daily limit
  const todaySpent = isCurrentMonth
    ? expenses.filter((e: any) => e.date === todayStr && e.type === 'expense').reduce((s: number, e: any) => s + e.amount, 0)
    : 0;
  const dailyStatus = dailyLimit && dailyLimit > 0
    ? todaySpent > dailyLimit ? '🔴' : todaySpent > dailyLimit * 0.8 ? '🟡' : '🟢'
    : null;

  function openBudgetModal() {
    setDailyInput(budgetLimits.dailyLimit ? budgetLimits.dailyLimit.toString() : '');
    setMonthlyInput(budgetLimits.monthlyLimit ? budgetLimits.monthlyLimit.toString() : '');
    setBudgetModal(true);
  }

  function saveBudget() {
    const dl = parseFloat(dailyInput);
    const ml = parseFloat(monthlyInput);
    setBudgetLimits({
      dailyLimit: isNaN(dl) || dl <= 0 ? undefined : dl,
      monthlyLimit: isNaN(ml) || ml <= 0 ? undefined : ml,
    });
    setBudgetModal(false);
  }

  const pct = monthlyLimit && monthlyLimit > 0 ? Math.min(100, (spent / monthlyLimit) * 100) : 0;

  return (
    <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
      {/* Header row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: c.text }}>This Month</Text>
        <TouchableOpacity
          onPress={openBudgetModal}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.card, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: c.border }}>
          <Text style={{ fontSize: 11, color: c.tint, fontWeight: '600' }}>💰 Set Budget</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {/* Tasks card — tappable */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: c.card, borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: c.tint }}
          onPress={() => setTaskModal(true)}
          activeOpacity={0.7}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>{monthTodos.length}</Text>
          <Text style={{ fontSize: 11, color: c.subtext, marginTop: 3 }}>Tasks ›</Text>
        </TouchableOpacity>

        {/* Events card — tappable, shows today's events */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: c.card, borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: c.accent }}
          onPress={() => setTodayEventsModal(true)}
          activeOpacity={0.7}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>{todayEvents.length}</Text>
          <Text style={{ fontSize: 11, color: c.subtext, marginTop: 3 }}>Today's Events ›</Text>
        </TouchableOpacity>

        {/* Balance card — tappable, color driven by budget */}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: c.card, borderRadius: 14, padding: 14, borderLeftWidth: 4, borderLeftColor: balanceColor }}
          onPress={() => setExpenseModal(true)}
          activeOpacity={0.7}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: balanceColor }}>Rs.{(income - spent).toFixed(0)}</Text>
          <Text style={{ fontSize: 10, color: c.subtext, marginTop: 3 }}>{budgetStatus} ›</Text>
        </TouchableOpacity>
      </View>

      {/* Daily limit indicator */}
      {!!dailyStatus && isCurrentMonth && (
        <View style={{ marginTop: 8, backgroundColor: c.card, borderRadius: 12, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: c.subtext }}>Today's spending</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.text }}>
            {dailyStatus} Rs.{todaySpent.toFixed(0)} / Rs.{dailyLimit}
          </Text>
        </View>
      )}

      {/* Monthly budget progress bar */}
      {!!monthlyLimit && monthlyLimit > 0 && (
        <View style={{ marginTop: 6, backgroundColor: c.card, borderRadius: 12, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 12, color: c.subtext }}>Monthly budget</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: c.text }}>Rs.{spent.toFixed(0)} / Rs.{monthlyLimit}</Text>
          </View>
          <View style={{ height: 6, backgroundColor: c.border, borderRadius: 3, flexDirection: 'row', overflow: 'hidden' }}>
            <View style={{ flex: pct, height: 6, backgroundColor: balanceColor }} />
            <View style={{ flex: 100 - pct }} />
          </View>
          {daysElapsed > 0 && (
            <Text style={{ fontSize: 10, color: c.subtext, marginTop: 4 }}>
              Pace: Rs.{((monthlyLimit / daysInMonth) * daysElapsed).toFixed(0)} for {daysElapsed} day{daysElapsed !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      )}

      {/* ── Task List Modal ─────────────────────────────── */}
      <Modal visible={taskModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>Tasks this month</Text>
              <TouchableOpacity onPress={() => setTaskModal(false)}>
                <Text style={{ fontSize: 22, color: c.subtext }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {monthTodos.length === 0 && (
                <Text style={{ color: c.subtext, textAlign: 'center', paddingTop: 30 }}>No tasks this month</Text>
              )}
              {monthTodos.map((todo: any) => {
                const pColor = todo.priority === 'high' ? c.danger : todo.priority === 'medium' ? '#F59E0B' : c.success;
                return (
                  <TouchableOpacity
                    key={todo.id}
                    onPress={() => { setTaskModal(false); router.push(`/day/${todo.dueDate}`); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
                    <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: pColor }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '600', color: c.text, textDecorationLine: todo.completed ? 'line-through' : 'none' }}>{todo.title}</Text>
                      <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>{todo.dueDate} · {todo.category}</Text>
                    </View>
                    {todo.completed && <Text style={{ fontSize: 16 }}>✅</Text>}
                    <Text style={{ color: c.tint, fontSize: 18 }}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Expense List Modal ──────────────────────────── */}
      <Modal visible={expenseModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>Expenses this month</Text>
              <TouchableOpacity onPress={() => setExpenseModal(false)}>
                <Text style={{ fontSize: 22, color: c.subtext }}>✕</Text>
              </TouchableOpacity>
            </View>
            {/* Summary row */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 1, backgroundColor: c.background, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: c.success }}>+ Rs.{income.toFixed(0)}</Text>
                <Text style={{ fontSize: 10, color: c.subtext, marginTop: 2 }}>Income</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: c.background, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: c.danger }}>- Rs.{spent.toFixed(0)}</Text>
                <Text style={{ fontSize: 10, color: c.subtext, marginTop: 2 }}>Spent</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: c.background, borderRadius: 12, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: balanceColor }}>Rs.{(income - spent).toFixed(0)}</Text>
                <Text style={{ fontSize: 10, color: c.subtext, marginTop: 2 }}>Balance</Text>
              </View>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {monthExpenses.length === 0 && (
                <Text style={{ color: c.subtext, textAlign: 'center', paddingTop: 30 }}>No expenses this month</Text>
              )}
              {[...monthExpenses].sort((a: any, b: any) => b.date.localeCompare(a.date)).map((exp: any) => (
                <TouchableOpacity
                  key={exp.id}
                  onPress={() => { setExpenseModal(false); router.push(`/day/${exp.date}?tab=expenses`); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
                  <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: exp.type === 'income' ? c.success : c.danger }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{exp.note || exp.category}</Text>
                    <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>{exp.date} · {exp.category}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: exp.type === 'income' ? c.success : c.danger }}>
                    {exp.type === 'income' ? '+' : '-'}Rs.{exp.amount.toFixed(0)}
                  </Text>
                  <Text style={{ color: c.tint, fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Today's Events Modal ────────────────────────── */}
      <Modal visible={todayEventsModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>Today's Events</Text>
              <TouchableOpacity onPress={() => setTodayEventsModal(false)}>
                <Text style={{ fontSize: 22, color: c.subtext }}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {todayEvents.length === 0 && (
                <Text style={{ color: c.subtext, textAlign: 'center', paddingTop: 30 }}>No events for today</Text>
              )}
              {todayEvents.map((ev: any) => (
                <TouchableOpacity
                  key={ev.id}
                  onPress={() => { setTodayEventsModal(false); router.push(`/day/${todayStr}?tab=events`); }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.border }}>
                  <View style={{ width: 4, height: 36, borderRadius: 2, backgroundColor: c.accent }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: c.text }}>{ev.title}</Text>
                    <Text style={{ fontSize: 11, color: c.subtext, marginTop: 2 }}>⏰ {ev.startTime} – {ev.endTime}{ev.location ? ` · 📍 ${ev.location}` : ''}</Text>
                  </View>
                  <Text style={{ color: c.tint, fontSize: 18 }}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Budget Modal ────────────────────────────────── */}
      <Modal visible={budgetModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: c.text }}>Set Budget Limits</Text>
              <TouchableOpacity onPress={() => setBudgetModal(false)}>
                <Text style={{ fontSize: 22, color: c.subtext }}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.subtext, marginBottom: 8 }}>Daily Limit (Rs.)</Text>
            <TextInput
              style={{ backgroundColor: c.background, borderRadius: 12, padding: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border, marginBottom: 16 }}
              value={dailyInput}
              onChangeText={setDailyInput}
              placeholder="e.g. 500"
              placeholderTextColor={c.subtext}
              keyboardType="numeric"
            />
            <Text style={{ fontSize: 13, fontWeight: '600', color: c.subtext, marginBottom: 8 }}>Monthly Limit (Rs.)</Text>
            <TextInput
              style={{ backgroundColor: c.background, borderRadius: 12, padding: 12, fontSize: 15, color: c.text, borderWidth: 1, borderColor: c.border, marginBottom: 16 }}
              value={monthlyInput}
              onChangeText={setMonthlyInput}
              placeholder="e.g. 10000"
              placeholderTextColor={c.subtext}
              keyboardType="numeric"
            />
            <Text style={{ fontSize: 11, color: c.subtext, marginBottom: 20 }}>
              💡 Monthly limit uses pro-rated tracking — e.g. if limit is Rs.1000 and 3 days have passed, red threshold = Rs.{(1000 / 30 * 3).toFixed(0)}
            </Text>
            <TouchableOpacity
              style={{ backgroundColor: c.tint, borderRadius: 14, padding: 16, alignItems: 'center' }}
              onPress={saveBudget}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Save Budget</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function styles(c: (typeof Colors)['light']) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.background },
    header: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 8 },
    appTitle: { fontSize: 26, fontWeight: '800', color: c.text },
    appSub: { fontSize: 13, color: c.subtext, marginTop: 4 },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
    navBtn: { width: 40, height: 40, backgroundColor: c.card, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: c.border },
    navArrow: { fontSize: 24, color: c.tint, fontWeight: '700', lineHeight: 28 },
    monthLabel: { fontSize: 18, fontWeight: '800', color: c.text },
    weekRow: { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 6 },
    weekLabel: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: c.subtext, textTransform: 'uppercase', letterSpacing: 0.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 },
    cell: { width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, padding: 2 },
    todayCell: { backgroundColor: c.tint },
    dayText: { fontSize: 15, fontWeight: '600', color: c.text },
    todayText: { color: '#fff' },
    dotsRow: { flexDirection: 'row', gap: 3, marginTop: 3 },
    dot: { width: 5, height: 5, borderRadius: 3 },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 12, marginBottom: 16 },
  });
}
