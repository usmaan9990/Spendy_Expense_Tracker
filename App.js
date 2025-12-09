
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Constants & Styles ---
const THEMES = {
  light: {
    primary: '#4A90E2',
    secondary: '#50E3C2',
    accent: '#F5A623',
    background: '#F5F7FA',
    card: '#FFFFFF',
    text: '#333333',
    subText: '#888888',
    income: '#2ECC71',
    expense: '#E74C3C',
    border: '#E1E4E8',
    statusBarStyle: 'dark-content',
  },
  dark: {
    primary: '#5A9DF2', // Slightly lighter blue for dark mode
    secondary: '#50E3C2',
    accent: '#F5A623',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    subText: '#AAAAAA',
    income: '#2ECC71',
    expense: '#FF6B6B', // Lighter red
    border: '#333333',
    statusBarStyle: 'light-content',
  },
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function App() {
  // --- State ---
  const [theme, setTheme] = useState('light');
  const colors = THEMES[theme];
  const [isLoaded, setIsLoaded] = useState(false);

  const [transactions, setTransactions] = useState([]);

  const [categories, setCategories] = useState({
    Income: ['Salary', 'Gift', 'Freelance'],
    Expense: ['Food', 'Transport', 'Shopping', 'Bills'],
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    type: 'Expense', // 'Income' or 'Expense'
    amount: '',
    category: '',
    note: '',
  });

  // State for adding a new category on the fly
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Filter State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Date Picker State
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

  // --- Persistence ---
  const STORAGE_KEYS = {
    TRANSACTIONS: '@tracker_app_transactions',
    CATEGORIES: '@tracker_app_categories',
    THEME: '@tracker_app_theme',
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [storedTransactions, storedCategories, storedTheme] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.TRANSACTIONS),
          AsyncStorage.getItem(STORAGE_KEYS.CATEGORIES),
          AsyncStorage.getItem(STORAGE_KEYS.THEME),
        ]);

        if (storedTransactions) setTransactions(JSON.parse(storedTransactions));
        if (storedCategories) setCategories(JSON.parse(storedCategories));
        if (storedTheme) setTheme(storedTheme);
      } catch (e) {
        Alert.alert('Error', 'Failed to load data.');
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions)).catch(e => console.error(e));
    }
  }, [transactions, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories)).catch(e => console.error(e));
    }
  }, [categories, isLoaded]);

  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEYS.THEME, theme).catch(e => console.error(e));
    }
  }, [theme, isLoaded]);

  // --- Helpers ---
  const formatCurrency = (amount) => {
    return '$' + Number(amount).toFixed(2);
  };

  const getMonthYear = (date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const isSameMonth = (d1, d2) => {
    const date1 = new Date(d1);
    const date2 = new Date(d2);
    return date1.getMonth() === date2.getMonth() && date1.getFullYear() === date2.getFullYear();
  };

  const isFutureMonth = (date) => {
    const now = new Date();
    const viewed = new Date(date.getFullYear(), date.getMonth(), 1);
    const current = new Date(now.getFullYear(), now.getMonth(), 1);
    return viewed > current;
  };

  const getFilteredTransactions = () => {
    return transactions.filter(t => isSameMonth(t.dateISO, currentDate));
  };

  const filteredTransactions = getFilteredTransactions();

  const getTotals = () => {
    const income = filteredTransactions
      .filter((t) => t.type === 'Income')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    const expense = filteredTransactions
      .filter((t) => t.type === 'Expense')
      .reduce((acc, curr) => acc + Number(curr.amount), 0);
    return { income, expense, balance: income - expense };
  };

  const totals = getTotals();

  // --- Handlers ---
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleAddTransaction = () => {
    if (!newTransaction.amount || !newTransaction.category) {
      Alert.alert('Missing Info', 'Please enter an amount and select a category.');
      return;
    }

    const now = new Date();
    // Use the currently viewed month/year for the transaction date
    const transactionDate = new Date(currentDate);
    transactionDate.setDate(now.getDate());

    // Handle month rollover
    if (transactionDate.getMonth() !== currentDate.getMonth()) {
      transactionDate.setDate(0);
    }

    const transaction = {
      id: Date.now().toString(),
      dateISO: transactionDate.toISOString(),
      displayDate: transactionDate.toLocaleDateString(),
      ...newTransaction,
      amount: parseFloat(newTransaction.amount),
    };

    setTransactions([transaction, ...transactions]);
    setModalVisible(false);
    // Reset form
    setNewTransaction({
      type: 'Expense',
      amount: '',
      category: '',
      note: '',
    });
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const confirmDelete = (id) => {
    Alert.alert(
      "Delete Transaction",
      "Are you sure you want to remove this transaction?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setTransactions(prev => prev.filter(t => t.id !== id));
          }
        }
      ]
    );
  };

  const handleAddNewCategory = () => {
    if (!newCategoryName.trim()) return;

    setCategories(prev => ({
      ...prev,
      [newTransaction.type]: [...prev[newTransaction.type], newCategoryName.trim()]
    }));

    setNewTransaction({ ...newTransaction, category: newCategoryName.trim() });
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const changeMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const openPicker = () => {
    setPickerYear(currentDate.getFullYear());
    setPickerVisible(true);
  };

  const selectMonthYear = (monthIndex) => {
    const newDate = new Date(pickerYear, monthIndex, 1);
    setCurrentDate(newDate);
    setPickerVisible(false);
  };

  // --- Render Items ---
  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={() => confirmDelete(item.id)}
    >
      <View style={[styles.transactionItem, { backgroundColor: colors.card }]}>
        <View style={styles.transactionLeft}>
          <View style={[styles.iconPlaceholder, { backgroundColor: item.type === 'Income' ? colors.income + '20' : colors.expense + '20' }]}>
            <Text style={{ fontSize: 20 }}>{item.type === 'Income' ? '💰' : '💸'}</Text>
          </View>
          <View>
            <Text style={[styles.transactionCategory, { color: colors.text }]}>{item.category}</Text>
            {item.note ? <Text style={[styles.transactionNote, { color: colors.subText }]}>{item.note}</Text> : null}
          </View>
        </View>
        <View>
          <Text style={[styles.transactionAmount, { color: item.type === 'Income' ? colors.income : colors.expense }]}>
            {item.type === 'Income' ? '+' : '-'} {formatCurrency(item.amount)}
          </Text>
          <Text style={[styles.transactionDate, { color: colors.subText }]}>{item.displayDate}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => (
    <View style={styles.footerContainer}>
      <Text style={[styles.footerText, { color: colors.subText }]}>
        © 2025 Spendy 👨‍💻 Developed by Loooploye 121
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.statusBarStyle} backgroundColor={colors.background} />

      {!isLoaded ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>


          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.background }]}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>My Wallet</Text>
            <TouchableOpacity onPress={toggleTheme} style={styles.themeButton}>
              <Text style={{ fontSize: 24 }}>{theme === 'light' ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
          </View>

          {/* Month Selector */}
          <View style={styles.monthSelector}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.arrowButton}>
              <Text style={[styles.arrowText, { color: colors.primary }]}>{'<'}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openPicker}>
              <Text style={[styles.monthText, { color: colors.text }]}>{getMonthYear(currentDate)}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => changeMonth(1)} style={styles.arrowButton}>
              <Text style={[styles.arrowText, { color: colors.primary }]}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          {/* Summary Card */}
          <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
            <View style={styles.balanceContainer}>
              <Text style={[styles.balanceLabel, { color: colors.subText }]}>Total Balance</Text>
              <Text style={[styles.balanceAmount, { color: colors.text }]}>{formatCurrency(totals.balance)}</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: colors.income + '20' }]}>
                  <Text>⬇️</Text>
                </View>
                <View>
                  <Text style={[styles.statLabel, { color: colors.subText }]}>Income</Text>
                  <Text style={[styles.statValue, { color: colors.income }]}>{formatCurrency(totals.income)}</Text>
                </View>
              </View>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <View style={[styles.statIcon, { backgroundColor: colors.expense + '20' }]}>
                  <Text>⬆️</Text>
                </View>
                <View>
                  <Text style={[styles.statLabel, { color: colors.subText }]}>Expense</Text>
                  <Text style={[styles.statValue, { color: colors.expense }]}>{formatCurrency(totals.expense)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Transaction List */}
          <View style={styles.listContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Transactions</Text>
            <FlatList
              data={filteredTransactions}
              keyExtractor={(item) => item.id}
              renderItem={renderTransactionItem}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={[styles.emptyStateText, { color: colors.subText }]}>No transactions for this month.</Text>
                </View>
              }
              ListFooterComponent={renderFooter}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
              ListFooterComponentStyle={{ flex: 1, justifyContent: 'flex-end' }}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Add Button - Hide if future month */}
          {!isFutureMonth(currentDate) && (
            <TouchableOpacity
              style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
              activeOpacity={0.8}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
          )}

          {/* Add Transaction Modal */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>New Transaction</Text>

                {/* Type Switcher */}
                <View style={[styles.typeSwitcher, { backgroundColor: colors.background }]}>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newTransaction.type === 'Income' && { backgroundColor: colors.card, borderColor: colors.income, borderWidth: 1 }
                    ]}
                    onPress={() => setNewTransaction({ ...newTransaction, type: 'Income', category: '' })}
                  >
                    <Text style={[
                      styles.typeButtonText, { color: colors.subText },
                      newTransaction.type === 'Income' && { color: colors.text }
                    ]}>Income</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeButton,
                      newTransaction.type === 'Expense' && { backgroundColor: colors.card, borderColor: colors.expense, borderWidth: 1 }
                    ]}
                    onPress={() => setNewTransaction({ ...newTransaction, type: 'Expense', category: '' })}
                  >
                    <Text style={[
                      styles.typeButtonText, { color: colors.subText },
                      newTransaction.type === 'Expense' && { color: colors.text }
                    ]}>Expense</Text>
                  </TouchableOpacity>
                </View>

                {/* Amount Input */}
                <Text style={[styles.label, { color: colors.subText }]}>Amount</Text>
                <View style={[styles.inputContainer, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.currencySymbol, { color: colors.text }]}>$</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    placeholder="0.00"
                    placeholderTextColor={colors.subText}
                    keyboardType="numeric"
                    value={newTransaction.amount}
                    onChangeText={(text) => setNewTransaction({ ...newTransaction, amount: text })}
                  />
                </View>

                {/* Category Selection */}
                <View style={styles.rowBetween}>
                  <Text style={[styles.label, { color: colors.subText }]}>Category</Text>
                  {!isAddingCategory && (
                    <TouchableOpacity onPress={() => setIsAddingCategory(true)}>
                      <Text style={[styles.linkText, { color: colors.primary }]}>+ Add New</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isAddingCategory ? (
                  <View style={styles.addCategoryContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.background, color: colors.text }]}
                      placeholder="New Category Name"
                      placeholderTextColor={colors.subText}
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                    />
                    <TouchableOpacity style={[styles.smallButton, { backgroundColor: colors.primary }]} onPress={handleAddNewCategory}>
                      <Text style={styles.smallButtonText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.smallButtonDestructive, { backgroundColor: colors.background }]} onPress={() => setIsAddingCategory(false)}>
                      <Text style={[styles.smallButtonText, { color: colors.text }]}>X</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    {categories[newTransaction.type].map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          { backgroundColor: colors.background },
                          newTransaction.category === cat &&
                          { backgroundColor: newTransaction.type === 'Income' ? colors.income : colors.expense }
                        ]}
                        onPress={() => setNewTransaction({ ...newTransaction, category: cat })}
                      >
                        <Text
                          style={[
                            styles.categoryChipText, { color: colors.text },
                            newTransaction.category === cat && styles.categoryChipTextActive
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Note Input */}
                <Text style={[styles.label, { color: colors.subText }]}>Note (Optional)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.text }]}
                  placeholder="E.g. Lunch with friends"
                  placeholderTextColor={colors.subText}
                  value={newTransaction.note}
                  onChangeText={(text) => setNewTransaction({ ...newTransaction, note: text })}
                />

                {/* Actions */}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton, { backgroundColor: colors.background }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleAddTransaction}
                  >
                    <Text style={styles.saveButtonText}>Save Transaction</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* Month Picker Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={pickerVisible}
            onRequestClose={() => setPickerVisible(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={[styles.pickerContent, { backgroundColor: colors.card }]}>
                {/* Year Selector */}
                <View style={styles.yearRow}>
                  <TouchableOpacity onPress={() => setPickerYear(pickerYear - 1)} style={styles.arrowButton}>
                    <Text style={[styles.arrowText, { color: colors.primary }]}>{'<'}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.yearText, { color: colors.text }]}>{pickerYear}</Text>
                  <TouchableOpacity onPress={() => setPickerYear(pickerYear + 1)} style={styles.arrowButton}>
                    <Text style={[styles.arrowText, { color: colors.primary }]}>{'>'}</Text>
                  </TouchableOpacity>
                </View>

                {/* Month Grid */}
                <View style={styles.monthGrid}>
                  {MONTHS.map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.monthCell,
                        { backgroundColor: colors.background },
                        index === currentDate.getMonth() && pickerYear === currentDate.getFullYear() && { backgroundColor: colors.primary }
                      ]}
                      onPress={() => selectMonthYear(index)}
                    >
                      <Text style={[
                        styles.monthCellText,
                        { color: colors.text },
                        index === currentDate.getMonth() && pickerYear === currentDate.getFullYear() && { color: 'white', fontWeight: 'bold' }
                      ]}>
                        {month.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.closeButton, { backgroundColor: colors.background }]}
                  onPress={() => setPickerVisible(false)}
                >
                  <Text style={[styles.closeButtonText, { color: colors.text }]}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

        </>
      )
      }

    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  themeButton: {
    padding: 8,
    borderRadius: 20,
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    width: 150,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowButton: {
    padding: 10,
  },
  arrowText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  summaryCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  balanceContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    marginBottom: 5,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 30,
    marginHorizontal: 15,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statLabel: {
    fontSize: 12,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    padding: 15,
    borderRadius: 12,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionNote: {
    fontSize: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  transactionDate: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: 'white',
    marginTop: -2,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', // Center for Picker
    alignItems: 'center',
  },
  modalContent: {
    width: '100%',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    minHeight: 500,
    marginTop: 'auto', // Push to bottom for transaction modal
  },
  pickerContent: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 24,
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    paddingVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
  },
  typeSwitcher: {
    flexDirection: 'row',
    marginBottom: 25,
    padding: 4,
    borderRadius: 12,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryScroll: {
    marginBottom: 20,
    maxHeight: 50,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  categoryChipText: {
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    marginRight: 10,
  },
  saveButton: {
    marginLeft: 10,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 10,
  },
  linkText: {
    fontWeight: '600',
  },
  addCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  smallButton: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    marginLeft: 10,
  },
  smallButtonDestructive: {
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 10,
    marginLeft: 5,
  },
  smallButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  yearRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  yearText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  monthCell: {
    width: '30%',
    padding: 10,
    alignItems: 'center',
    borderRadius: 10,
    marginBottom: 15,
  },
  monthCellText: {
    fontSize: 16,
  },
  closeButton: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  closeButtonText: {
    fontWeight: 'bold',
  },
  footerContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    // marginBottom removed to allow ListFooterComponentStyle to control positioning
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

