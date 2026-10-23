import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, Button, FlatList, PermissionsAndroid, StyleSheet,
  SafeAreaView, Platform, TextInput, Modal, TouchableOpacity,
} from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { parseCBE, Txn } from './parsers/cbe';
import { Row, saveTxns, searchTxns, setSender } from './db';

export default function App() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('Tap "Scan CBE messages"');
  const [editing, setEditing] = useState<Row | null>(null);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    setRows(await searchTxns(q));
  }, [q]);

  useEffect(() => { load(); }, [load]);

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
      JSON.stringify({ box: 'inbox', address: 'CBE', maxCount: 5000 }),
      (e: string) => setStatus('Error: ' + e),
      async (_c: number, smsList: string) => {
        const arr = JSON.parse(smsList);
        const out: Txn[] = [];
        let bad = 0;
        for (const s of arr) {
          const t = parseCBE(s.body, Number(s.date));
          if (t) out.push(t); else bad++;
        }
        const added = await saveTxns(out);
        await load();
        setStatus(`${added} new saved, ${bad} unparsed`);
      }
    );
  };

  const saveName = async () => {
    if (editing) await setSender(editing.id, name);
    setEditing(null);
    await load();
  };

  const totalIn = rows.filter(r => r.type === 'credit').reduce((a, r) => a + r.amount, 0);
  const totalOut = rows.filter(r => r.type === 'debit').reduce((a, r) => a + r.amount, 0);

  return (
    <SafeAreaView style={s.c}>
      <Text style={s.h}>CBE Statement</Text>
      <Button title="Scan CBE messages" onPress={scan} />
      <Text style={s.st}>{status}</Text>
      <TextInput
        style={s.search}
        placeholder="Search name, date (2026-10), amount, ref"
        value={q}
        onChangeText={setQ}
      />
      <Text style={s.tot}>
        {rows.length} shown · In {totalIn.toFixed(2)} · Out {totalOut.toFixed(2)}
      </Text>
      <FlatList
        data={rows}
        keyExtractor={r => String(r.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.row}
            onPress={() => { setEditing(item); setName(item.sender ?? ''); }}
          >
            <View style={{ flex: 1 }}>
              <Text style={item.sender ? s.name : s.noname}>
                {item.sender ?? '(tap to add name)'}
              </Text>
              <Text style={s.d}>{new Date(item.date).toLocaleString()}</Text>
              <Text style={s.d}>{item.ref ?? ''}</Text>
            </View>
            <Text style={{ color: item.type === 'credit' ? 'green' : 'red', fontWeight: '600' }}>
              {item.type === 'credit' ? '+' : '-'}{item.amount.toFixed(2)}
            </Text>
          </TouchableOpacity>
        )}
      />
      <Modal visible={!!editing} transparent animationType="fade">
        <View style={s.modalBg}>
          <View style={s.modal}>
            <Text style={s.h}>Sender name</Text>
            <TextInput style={s.search} value={name} onChangeText={setName} autoFocus placeholder="Name" />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <Button title="Cancel" onPress={() => setEditing(null)} />
              <Button title="Save" onPress={saveName} />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  c: { flex: 1, padding: 16, paddingTop: 48 },
  h: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  st: { marginVertical: 8, color: '#555' },
  search: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10 },
  tot: { marginVertical: 8, fontWeight: '600' },
  row: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#eee' },
  name: { fontSize: 15, fontWeight: '600' },
  noname: { fontSize: 15, color: '#999', fontStyle: 'italic' },
  d: { fontSize: 12, color: '#666' },
  modalBg: { flex: 1, backgroundColor: '#0006', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#fff', borderRadius: 12, padding: 16 },
});
