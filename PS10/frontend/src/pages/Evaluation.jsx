import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ErrorBox, Kpi, Loading, useApi } from '../components/ui'

export default function Evaluation() {
  const { data, error, loading } = useApi('/evaluation')
  if (error) return <ErrorBox error={error} />
  if (loading || !data) return <Loading />
  const om = data.outcome_model, rv = data.readiness_validity, m = data.matching, jp = data.jd_parser, pf = data.performance, em = data.embeddings
  const deployed = om.models[0]
  const [ours, prior, cgpa] = m.methods
  const short = { [ours]: 'FitNet (learned)', [prior]: 'Expert prior', [cgpa]: 'CGPA rank', 'Baseline: random': 'Random' }
  const matchChart = m.methods.map((k) => ({ method: short[k], 'Precision@k': m.summary[k].precision_at_k, 'NDCG@10': m.summary[k].ndcg_at_10 }))
  return (
    <>
      <div className="topbar"><div><h1>Model Evaluation & Performance</h1><p>Accuracy of the PyTorch models, matching, parsing and scheduling on the simulated dataset</p></div></div>
      <div className="kpis">
        <Kpi label="PlacementNet ROC-AUC" value={deployed.roc_auc} sub={`F1 ${deployed.f1} · ${om.split}`} tone="ok" />
        <Kpi label="Readiness vs outcome AUC" value={rv.auc_readiness_vs_placed} sub={rv.monotonic ? 'Levels are monotonic ✓' : 'not monotonic'} tone="ok" />
        <Kpi label="FitNet NDCG@10" value={m.summary[ours].ndcg_at_10} sub={`prior ${m.summary[prior].ndcg_at_10} · CGPA ${m.summary[cgpa].ndcg_at_10}`} tone="accent" />
        <Kpi label="JD role classifier" value={jp.role_classifier_accuracy_on_jobs} sub={`accuracy on real JDs · holdout ${jp.role_classifier_holdout_accuracy}`} />
        <Kpi label="Scheduler conflicts" value={`${pf.scheduler_conflicts_before} → ${pf.scheduler_conflicts_after}`} sub={`${pf.scheduler_ms} ms`} />
        <Kpi label="Match latency" value={`${pf.match_per_1000_pairs_ms} ms`} sub={`per 1,000 pairs · ${pf.device}`} />
      </div>
      <div className="grid g2">
        <div className="card">
          <h2>Placement-outcome models (temporal hold-out: batch 2026)</h2>
          <table>
            <thead><tr><th>Model (PyTorch)</th><th className="num">Acc</th><th className="num">Prec</th><th className="num">Recall</th><th className="num">F1</th><th className="num">AUC</th><th className="num">Brier</th></tr></thead>
            <tbody>{om.models.map((x) => <tr key={x.model}><td className="small"><b>{x.model}</b></td><td className="num">{x.accuracy}</td><td className="num">{x.precision}</td><td className="num">{x.recall}</td><td className="num">{x.f1}</td><td className="num">{x.roc_auc}</td><td className="num">{x.brier}</td></tr>)}</tbody>
          </table>
          <p className="small muted">5-fold CV AUC (single MLP) {om.cv_auc_mean} ± {om.cv_auc_std} · train {om.train_rows} / test {om.test_rows} · mean ensemble σ {om.mean_ensemble_std}. At-risk detection: precision {om.at_risk.precision}, recall {om.at_risk.recall}.</p>
        </div>
        <div className="card">
          <h2>Readiness level vs. actual placement</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={rv.by_level} margin={{ top: 22 }}><CartesianGrid vertical={false} stroke="#eef1f6" /><XAxis dataKey="level" tick={{ fontSize: 11 }} /><YAxis unit="%" tick={{ fontSize: 11 }} /><Tooltip />
              <Bar dataKey="actual_placement_rate" name="Actual placement %" fill="#2b8a3e" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
          <p className="small muted">Hybrid score AUC {rv.auc_readiness_vs_placed} vs rubric-only {rv.auc_rubric_only}.</p>
        </div>
      </div>
      <div className="grid g2 mt">
        <div className="card">
          <h2>Ranking quality vs. hidden recruiter preference ({m.drives_evaluated} unseen drives)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={matchChart}><CartesianGrid vertical={false} stroke="#eef1f6" /><XAxis dataKey="method" tick={{ fontSize: 11 }} /><YAxis domain={[0, 1]} tick={{ fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Precision@k" fill="#3b5bdb" radius={[4, 4, 0, 0]} /><Bar dataKey="NDCG@10" fill="#15aabf" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="small muted">Mean Spearman ρ (FitNet) = {m.mean_spearman}. {m.note}</p>
        </div>
        <div className="card">
          <h2>JD parsing, embeddings & performance</h2>
          <table><tbody>
            <tr><td>Skill extraction precision / recall</td><td className="num">{jp.skill_precision} / {jp.skill_recall}</td></tr>
            <tr><td>CGPA / branch / backlog extraction accuracy</td><td className="num">{jp.cgpa_accuracy} / {jp.branch_accuracy} / {jp.backlog_accuracy}</td></tr>
            <tr><td>Role classifier – synthetic hold-out / real JDs</td><td className="num">{jp.role_classifier_holdout_accuracy} / {jp.role_classifier_accuracy_on_jobs}</td></tr>
            <tr><td>Skill2Vec nearest neighbour in same category</td><td className="num">{em.category_precision_at_1}</td></tr>
            <tr><td>Score one drive against all {pf.students} students</td><td className="num">{pf.match_one_drive_ms} ms</td></tr>
            <tr><td>Readiness scoring – whole batch</td><td className="num">{pf.readiness_all_students_ms} ms</td></tr>
            <tr><td>Projected: 10,000 students × 50 drives</td><td className="num">{pf.projected_10k_students_x_50_drives_s} s</td></tr>
          </tbody></table>
          <p className="small muted">{jp.note}</p>
        </div>
      </div>
      {pf.cpu_benchmarks && (
        <div className="card mt">
          <h2>CPU inference latency (all models run on the CPU · {pf.cpu_threads} threads)</h2>
          <table><thead><tr><th>Model / operation</th><th className="num">Latency</th></tr></thead>
            <tbody>{pf.cpu_benchmarks.map((b) => <tr key={b.model}><td>{b.model}</td><td className="num"><b>{b.ms < 1 ? b.ms.toFixed(3) : b.ms.toFixed(1)} ms</b></td></tr>)}</tbody></table>
        </div>)}
      <div className="card mt">
        <h2>Per-drive ranking results (unseen drives)</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Drive</th><th className="num">Eligible</th><th className="num">k</th><th className="num">P@k FitNet</th><th className="num">P@k prior</th><th className="num">P@k CGPA</th><th className="num">NDCG FitNet</th><th className="num">NDCG prior</th><th className="num">NDCG CGPA</th></tr></thead>
          <tbody>{m.per_drive.map((d) => <tr key={d.drive}><td className="small">{d.drive}</td><td className="num">{d.eligible}</td><td className="num">{d.k}</td>
            <td className="num"><b>{d[ours].precision_at_k}</b></td><td className="num">{d[prior].precision_at_k}</td><td className="num">{d[cgpa].precision_at_k}</td>
            <td className="num"><b>{d[ours].ndcg_at_10}</b></td><td className="num">{d[prior].ndcg_at_10}</td><td className="num">{d[cgpa].ndcg_at_10}</td></tr>)}</tbody>
        </table></div>
      </div>
    </>
  )
}
