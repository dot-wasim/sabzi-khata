import React, { useState, useEffect } from 'react';
import { getAuditLogs } from '../../api/auditLog';
import { AuditLogEntry } from '../../utils/types';
import { PageHeader } from '../../components/PageHeader';
import { Badge } from '../../components/Badge';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { EmptyState } from '../../components/EmptyState';
import { formatDate } from '../../utils/date';
import { ShieldAlert, User, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntity, setSelectedEntity] = useState('');
  const [selectedAction, setSelectedAction] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({
        entity: selectedEntity || undefined,
        action: selectedAction || undefined,
      });
      setLogs(res.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedEntity, selectedAction]);

  const toggleExpand = (id: number) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log & Activity History (ऑडिट लॉग)"
        subtitle="Immutable security trail of every create, update, and delete action across all ledgers"
      />

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row gap-3">
        <select
          value={selectedEntity}
          onChange={(e) => setSelectedEntity(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm"
        >
          <option value="">All Entities</option>
          <option value="Purchase">Purchase</option>
          <option value="Sale">Sale</option>
          <option value="Payment">Payment</option>
          <option value="Seller">Seller</option>
          <option value="Buyer">Buyer</option>
          <option value="Wastage">Wastage</option>
          <option value="Expense">Expense</option>
        </select>

        <select
          value={selectedAction}
          onChange={(e) => setSelectedAction(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm"
        >
          <option value="">All Actions</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit log entries"
          description="Activity will be recorded here as records are created and modified."
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="divide-y divide-gray-100">
            {logs.map((log) => {
              const isExpanded = expandedRow === log.id;
              const actionVariant =
                log.action === 'CREATE'
                  ? 'green'
                  : log.action === 'UPDATE'
                  ? 'blue'
                  : 'red';

              return (
                <div key={log.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                  <div
                    onClick={() => toggleExpand(log.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={actionVariant}>{log.action}</Badge>
                      <div>
                        <span className="font-bold text-gray-900 text-sm">
                          {log.entity} #{log.entityId}
                        </span>
                        <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{log.user?.name || `User #${log.userId}`}</span>
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(log.timestamp, 'dd MMM yyyy, hh:mm a')}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-gray-400">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>

                  {/* Expanded JSON details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {log.before && (
                        <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                          <span className="font-bold text-rose-800 block mb-1">Old Values (Before):</span>
                          <pre className="font-mono text-[11px] text-gray-700 whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(JSON.parse(log.before), null, 2)}
                          </pre>
                        </div>
                      )}
                      {log.after && (
                        <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100">
                          <span className="font-bold text-emerald-800 block mb-1">New Values (After):</span>
                          <pre className="font-mono text-[11px] text-gray-700 whitespace-pre-wrap overflow-x-auto">
                            {JSON.stringify(JSON.parse(log.after), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
