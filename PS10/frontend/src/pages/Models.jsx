import { useState } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../api'
import { ErrorBox, Kpi, Loading, Toast, useApi } from '../components/ui'

const SKIP = new Set(['name', 'framework', 'device', 'parameters', 'architecture', 'history', 'examples', 'learned_weights', 'expert_prior', 'task'])

function LossCurve({ history }) {
  if (!history) return null
  const keys = Object.keys(history).filter((k) => history[k]?.length)
  const n = Math.max(...keys.map((k) => history[k].length))
  const data = Array.from({ length: n }, (_, i) => ({ epoch: i + 1, ...Object.fromEntries(keys.map((k) => [k, history[k][i]])) }))
  const colors = { train: '#3b5bdb', val: '#15aabf', val_acc: '#2b8a3e' }
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -18 }}>
        <CartesianGrid vertical={false} stroke="#eef1f6" />
        <XAxis dataKey="epoch" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
        <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k) => <Line key={k} dataKey={k} name={k === 'train' ? 'train loss' : k === 'val' ? 'val loss' : 'val accuracy'} stroke={colors[k]} dot={false} strokeWidth={2} />)}
      </LineChart>
    </ResponsiveContainer>
  )
}

const fmtVal = (v) => Array.isArray(v) ? v.join(', ') : typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)

export default function Models() {
  const { data, error, loading, reload } = useApi('/models')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  if (error) return <ErrorBox error={error} />
  if (loading || !data) return <Loading />
  const totalParams = data.models.reduce((a, m) => a + (m.parameters || 0), 0)
  const retrain = async () => {
    setBusy(true)
    try { const r = await api.post('/admin/retrain'); setToast(`Retrained all PyTorch models – ${r.students_rescored} students re-scored, FitNet on ${r.fitnet_pairs} ranking pairs`); reload() } finally { setBusy(false) }
  }
  const loadLlm = async () => { await api.post('/llm/load'); setToast('LLM loading started in the background'); setTimeout(reload, 1500) }
  const llm = data.llm
  return (
    <>
      <div className="topbar">
        <div><h1>AI Models (PyTorch)</h1><p>Every learned component in CampusLink is a PyTorch model – architectures, training curves and parameters</p></div>
        <button className="btn primary" disabled={busy} onClick={retrain}>{busy ? 'Retraining…' : '↻ Retrain all models'}</button>
      </div>
      <div className="kpis">
        <Kpi label="Framework" value="PyTorch" sub={`v${data.framework.replace('PyTorch ', '')} · CPU only · ${data.cpu_threads} threads`} tone="accent" />
        <Kpi label="Models in production" value={data.models.length + (llm.available ? 1 : 0)} sub="neural networks" />
        <Kpi label="Trainable parameters" value={totalParams.toLocaleString()} sub="excluding the LLM" />
        <Kpi label="Generative LLM" value={llm.available ? 'Ready' : llm.state} sub={llm.model || '—'} tone={llm.available ? 'ok' : 'warn'} />
      </div>

      <div className="grid g2">
        {data.models.map((m) => (
          <div className="card" key={m.name}>
            <div className="row between"><h2 style={{ margin: 0 }}>{m.name}</h2><span className="badge b-violet">{m.parameters.toLocaleString()} params</span></div>
            <div className="small muted" style={{ margin: '4px 0 8px' }}>{m.task}</div>
            <LossCurve history={m.history} />
            <table className="small mt"><tbody>
              {Object.entries(m).filter(([k]) => !SKIP.has(k)).map(([k, v]) => <tr key={k}><td className="muted" style={{ width: '38%' }}>{k.replace(/_/g, ' ')}</td><td>{fmtVal(v)}</td></tr>)}
            </tbody></table>
            {m.learned_weights && (
              <div className="mt small"><b>Factor weights – expert prior → learned</b>
                {Object.entries(m.learned_weights).map(([k, v]) => (
                  <div key={k} className="row between" style={{ padding: '3px 0' }}><span>{k}</span><span>{(m.expert_prior[k] * 100).toFixed(1)}% → <b>{(v * 100).toFixed(1)}%</b></span></div>
                ))}
              </div>
            )}
            {m.examples && (
              <div className="mt small"><b>Nearest skills in embedding space</b>
                {Object.entries(m.examples).map(([k, v]) => <div key={k}><span className="tag">{k}</span> → {v.map(([s, c]) => `${s} (${c})`).join(', ')}</div>)}
              </div>
            )}
            <details className="mt small"><summary>PyTorch module</summary><pre style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{m.architecture}</pre></details>
          </div>
        ))}
        <div className="card">
          <div className="row between"><h2 style={{ margin: 0 }}>Generative LLM (transformers on PyTorch)</h2><span className={`badge ${llm.available ? 'b-green' : 'b-amber'}`}>{llm.state}</span></div>
          <table className="small mt"><tbody>
            {Object.entries(llm).filter(([k]) => !['mode'].includes(k)).map(([k, v]) => <tr key={k}><td className="muted" style={{ width: '38%' }}>{k.replace(/_/g, ' ')}</td><td style={{ wordBreak: 'break-word' }}>{v === null || v === undefined ? '—' : fmtVal(v)}</td></tr>)}
          </tbody></table>
          <p className="small muted">Runs a small instruction-tuned model fully on-premise. It is downloaded once from Hugging Face and cached; set <code>LLM_MODEL</code> to another model id or a local folder.</p>
          {!llm.available && llm.state !== 'loading' && <button className="btn" onClick={loadLlm}>Load LLM now</button>}
        </div>
      </div>
      <Toast msg={toast} onClose={() => setToast('')} />
    </>
  )
}
