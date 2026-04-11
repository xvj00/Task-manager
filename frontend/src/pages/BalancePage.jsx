import { useEffect, useState } from 'react';
import { Coins, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../api/axios';

export default function BalancePage() {
  const [data, setData] = useState({ balance: 0, transactions: [] });

  useEffect(() => {
    api.get('/transactions').then(r => setData(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-title"><Coins size={18} />Мой баланс</div>
      </div>

      <div className="detail-card" style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{ fontSize: 36, fontWeight: 600, color: '#92400e', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 4 }}>
          <Coins size={28} color="var(--amber)" />{data.balance}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text3)' }}>баллов на счёте</div>
      </div>

      <div className="section-title" style={{ marginBottom: 12 }}>История транзакций</div>

      {data.transactions.length === 0 ? (
        <div className="empty-state">История пуста</div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Тип</th>
                <th>Описание</th>
                <th>Задача</th>
                <th>Дата</th>
                <th>Сумма</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map(tx => (
                <tr key={tx.id}>
                  <td>
                    {tx.type === 'credit' ? (
                      <TrendingUp size={14} color="var(--emerald)" />
                    ) : (
                      <TrendingDown size={14} color="var(--rose)" />
                    )}
                  </td>
                  <td style={{ fontSize: 13 }}>{tx.description}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>{tx.task?.title || '—'}</td>
                  <td style={{ fontSize: 12, color: 'var(--text2)' }}>
                    {new Date(tx.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td style={{ fontSize: 13, fontWeight: 500, color: tx.type === 'credit' ? 'var(--emerald)' : 'var(--rose)' }}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
