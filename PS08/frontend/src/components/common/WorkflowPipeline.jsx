import { useNavigate } from 'react-router-dom';

const PIPELINE_STAGES = [
  {
    step: 1,
    label: 'Project Setup',
    desc: 'Create project with sector, location, BU & subsidiary',
    icon: '🏗️',
    color: '#7C3AED',
    route: '/organizations',
    tag: 'STAGE 1',
  },
  {
    step: 2,
    label: 'Data Collection',
    desc: 'Env, HR, Safety & Compliance officers submit metrics',
    icon: '📋',
    color: '#0284C7',
    route: '/data-collection',
    tag: 'STAGE 2',
  },
  {
    step: 3,
    label: 'AI Validation',
    desc: 'Auto-detect missing data, spikes & inconsistencies',
    icon: '🤖',
    color: '#D97706',
    route: '/validation',
    tag: 'STAGE 3',
  },
  {
    step: 4,
    label: 'Approval Review',
    desc: 'Super Admin reviews & approves validated records',
    icon: '✅',
    color: '#059669',
    route: '/approvals',
    tag: 'STAGE 4',
  },
  {
    step: 5,
    label: 'Consolidation',
    desc: 'Multi-dept rollup with ESG scoring & benchmarking',
    icon: '📊',
    color: '#F15A24',
    route: '/consolidation',
    tag: 'STAGE 5',
  },
  {
    step: 6,
    label: 'BRSR Report',
    desc: 'Auto-map to SEBI BRSR Sections A, B, C & download',
    icon: '📑',
    color: '#DC2626',
    route: '/brsr',
    tag: 'STAGE 6',
  },
];

const WorkflowPipeline = ({ stats }) => {
  const navigate = useNavigate();

  const getActiveStage = () => {
    if (!stats) return 1;
    if ((stats.approved || 0) > 0) return 5;
    if ((stats.byStatus?.Validated || 0) > 0) return 4;
    if (
      (stats.byStatus?.['Under Review'] || 0) +
        (stats.byStatus?.Submitted || 0) >
      0
    )
      return 3;
    if ((stats.draft || 0) > 0) return 2;
    return 1;
  };

  const activeStage = getActiveStage();

  return (
    <div
      className="esg-card"
      style={{
        marginBottom: '1.75rem',
        padding: '1.5rem 1.75rem',
        background: 'linear-gradient(135deg, #0F172A 0%, #1A2744 100%)',
        border: 'none',
        color: '#FFFFFF',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Background decorative blobs */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: 'rgba(241, 90, 36, 0.06)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -60,
          left: '30%',
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'rgba(2, 132, 199, 0.05)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              marginBottom: '0.25rem',
            }}
          >
            <span
              style={{
                padding: '0.15rem 0.55rem',
                borderRadius: '99px',
                background: 'rgba(241, 90, 36, 0.25)',
                color: '#FFA07A',
                fontSize: '0.68rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              SEBI BRSR PIPELINE
            </span>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
              6-Stage ESG Data-to-Report Workflow
            </span>
          </div>
          <h2
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: '#F8FAFC',
              margin: 0,
            }}
          >
            ESG Reporting Workflow — MEIL Group
          </h2>
        </div>
        <div
          style={{
            padding: '0.4rem 0.85rem',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            fontSize: '0.78rem',
            color: '#CBD5E1',
            flexShrink: 0,
          }}
        >
          Active Stage:&nbsp;
          <strong style={{ color: '#F15A24' }}>{activeStage} of 6</strong>
        </div>
      </div>

      {/* Pipeline Steps Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: 0,
          overflowX: 'auto',
          minWidth: 0,
        }}
      >
        {PIPELINE_STAGES.map((stage, index) => {
          const isActive = stage.step === activeStage;
          const isDone = stage.step < activeStage;

          return (
            <div
              key={stage.step}
              onClick={() => navigate(stage.route)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '0.75rem 0.5rem',
                position: 'relative',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = 'translateY(-3px)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.transform = 'translateY(0)')
              }
              title={`${stage.label} — ${stage.desc}`}
            >
              {/* Connector line left half */}
              {index > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50px',
                    width: '50%',
                    height: '2px',
                    background:
                      isDone || isActive
                        ? `linear-gradient(90deg, ${PIPELINE_STAGES[index - 1].color}80, ${stage.color}80)`
                        : 'rgba(255,255,255,0.1)',
                    zIndex: 0,
                  }}
                />
              )}

              {/* Connector line right half */}
              {index < PIPELINE_STAGES.length - 1 && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50px',
                    width: '50%',
                    height: '2px',
                    background: isDone
                      ? `linear-gradient(90deg, ${stage.color}80, ${PIPELINE_STAGES[index + 1].color}80)`
                      : 'rgba(255,255,255,0.1)',
                    zIndex: 0,
                  }}
                />
              )}

              {/* Stage Circle */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: isActive
                    ? `radial-gradient(circle, ${stage.color}, ${stage.color}CC)`
                    : isDone
                    ? `${stage.color}30`
                    : 'rgba(255,255,255,0.06)',
                  border: isActive
                    ? `3px solid ${stage.color}`
                    : isDone
                    ? `2px solid ${stage.color}60`
                    : '2px solid rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isDone ? '1.1rem' : '1.4rem',
                  position: 'relative',
                  zIndex: 1,
                  boxShadow: isActive
                    ? `0 0 24px ${stage.color}50`
                    : 'none',
                  transition: 'all 0.3s ease',
                  flexShrink: 0,
                  marginBottom: '0.6rem',
                  color: isDone ? stage.color : '#FFFFFF',
                  fontWeight: isDone ? 800 : 400,
                }}
              >
                {isDone ? '✓' : stage.icon}

                {/* Active pulsing outer ring */}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: -6,
                      borderRadius: '50%',
                      border: `2px solid ${stage.color}40`,
                      animation: 'pulse 2s ease infinite',
                    }}
                  />
                )}
              </div>

              {/* Stage Label */}
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: isActive
                    ? '#F8FAFC'
                    : isDone
                    ? `${stage.color}CC`
                    : '#64748B',
                  textAlign: 'center',
                  letterSpacing: '0.02em',
                  lineHeight: 1.3,
                  marginBottom: '0.2rem',
                }}
              >
                {stage.label}
              </div>

              {/* Stage tag */}
              <div
                style={{
                  fontSize: '0.6rem',
                  fontWeight: 600,
                  color: isActive
                    ? stage.color
                    : isDone
                    ? `${stage.color}80`
                    : 'rgba(255,255,255,0.2)',
                  letterSpacing: '0.05em',
                  marginBottom: '0.25rem',
                }}
              >
                {stage.tag}
              </div>

              {/* Active blinking dot */}
              {isActive && (
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: stage.color,
                    animation: 'pulse 1.5s ease infinite',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer summary */}
      <div
        style={{
          marginTop: '1.25rem',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: '1.5rem',
          flexWrap: 'wrap',
          fontSize: '0.75rem',
          color: '#94A3B8',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ color: '#22C55E', fontWeight: 600 }}>
            ✓ Completed:{' '}
          </span>
          Stage 1–{Math.max(1, activeStage - 1)} done
        </div>
        <div>
          <span style={{ color: '#F15A24', fontWeight: 600 }}>
            ▶ Current:{' '}
          </span>
          Stage {activeStage} — {PIPELINE_STAGES[activeStage - 1]?.label}
        </div>
        <div>
          <span style={{ color: '#475569', fontWeight: 600 }}>
            ⏳ Remaining:{' '}
          </span>
          {6 - activeStage} stage{6 - activeStage !== 1 ? 's' : ''} to BRSR
          publication
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() =>
              navigate(
                PIPELINE_STAGES[activeStage - 1]?.route || '/dashboard'
              )
            }
            style={{
              background: '#F15A24',
              border: 'none',
              color: '#FFFFFF',
              padding: '0.35rem 0.85rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.73rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}
          >
            Continue Stage {activeStage} →
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkflowPipeline;
