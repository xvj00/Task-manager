import { useEffect, useState } from 'react';
import api from '../api/axios';
import useAuthStore from '../store/authStore';

export default function BalancePage() {
  const { user } = useAuthStore();
  const [data, setData] = useState({ balance: 0, transactions: [] });

  useEffect(() => {
    api.get('/transactions').then(r => setData(r.data)).catch(() => {});
  }, []);

  return (
    <div className="page">
      <div className="page-header"><h1>💰 Мой баланс</h1></div>

      <div className="balance-hero">
        <div className="balance-amount">{data.balance}</div>
        <div className="balance-label">баллов</div>
      </div>

      <div className="transactions-section">
        <h2>История транзакций</h2>
        {data.transactions.length === 0
          ? <p className="empty-state-big">📭 История пуста</p>
          : (
            <div className="transactions-list">
              {data.transactions.map(tx => (
                <div key={tx.id} className={`tx-row ${tx.type}`}>
                  <div className="tx-icon">{tx.type === 'credit' ? '💚' : '🔴'}</div>
                  <div className="tx-body">
                    <div className="tx-desc">{tx.description}</div>
                    {tx.task && <div className="tx-task">Задача: {tx.task.title}</div>}
                    <div className="tx-date">{new Date(tx.created_at).toLocaleString('ru-RU')}</div>
                  </div>
                  <div className={`tx-amount ${tx.type}`}>
                    {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}
