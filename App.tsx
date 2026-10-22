import React, { useState } from 'react';
import {
  View, Text, Button, FlatList, PermissionsAndroid,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { parseCBE, Txn } from './parsers/cbe';

export default function App() {
  const [txns, setTxns] = useState<Txn[]>([]);
  const [unparsed, setUnparsed] = useState(0);
  const [status, setStatus] = useState('Tap "Scan CBE messages"');

  const scan = async () => {
    if (Platform.OS !== 'android') return;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS
    );
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      setStatus('SMS permission denied');
      return;
    }
    setStatus('Reading...');
    SmsAndroid.list(
      JSON.stringify({ box: 'inbox', address: 'CBE', maxCount: 2000 }),
      (e: string) => setStatus('Error: ' + e),
      (_count: number, smsList: string) => {
        const arr = JSON.parse(smsList);
        const seen = new Set<string>();
        const out: Txn[] = [];
        let bad = 0;
        for (const s of arr) {
          const t = parseCBE(s.body, Number(s.date));
          if (!t) { bad++; continue; }
          const key = t.ref ?? s.body + s.date;
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(t);
        }
        out.sort((a, b) => b.date - a.date);
        setTxns(out);
        setUnparsed(bad);
        setStatus(`${out.length} transactions, ${bad} unparsed`);
      }
    );
  };

  return (
    <SafeAreaView style={styles.c}>
      <Text style={styles.h}>CBE Statement</Text>
      <Button title="Scan CBE messages" onPress={scan} />
      <Text style={styles.s}>{status}</Text>
      <FlatList
        data={txns}
        keyExtractor={(t, i) => (t.ref ?? '') + i}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View>
              <Text style={styles.d}>{new Date(item.date).toLocaleString()}</Text>
              <Text style={styles.d}>Bal: {item.balance.toFixed(2)}</Text>
            </View>
            <Text style={{ color: item.type === 'credit' ? 'green' : 'red', fontWeight: '600' }}>
              {item.type === 'credit' ? '+' : '-'}{item.amount.toFixed(2)}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, padding: 16, paddingTop: 48 },
  h: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  s: { marginVertical: 10, color: '#555' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  d: { fontSize: 12, color: '#666' },
});
