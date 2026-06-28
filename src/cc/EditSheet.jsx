import { catById, memberById, guessIcon, CATEGORY_ICONS } from './logic'
import { BRAND_GRADIENT } from './initialState'
import { Back, Close, ChevronDown, Check, Search, Trash, Plus, SplitIcon } from './icons'

const fieldBox = { display: 'flex', alignItems: 'center', gap: 9, border: '1.5px solid #E2E8F0', borderRadius: 13, cursor: 'pointer' }
const label = { fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.04em', marginBottom: 7 }

/** Hoja de edición de un gasto (bottom sheet con subpaneles). */
export default function EditSheet({ s, actions }) {
  const gid = s.groupId
  const g = s.groups[gid]
  const dr = s.draft
  const panel = s.editPanel
  // Etiquetas de división (estilo Splitwise): nombran a las personas para que sean claras
  // y correctas para cualquiera (no "yo/ellos", que dependía de quién mira). full_mine/theirs
  // se anclan al primer miembro del grupo (el creador histórico).
  const sp = s.splits[gid] || {}
  const anchor = g.members[0] || { short: 'Uno' }
  const other = g.members.find((m) => m.id !== anchor.id) || { short: 'la otra persona' }
  const splitLabels = {
    group: 'Se divide: ' + g.members.map((m) => m.short + ' ' + (sp[m.id] || 0) + '%').join(' · '),
    full_mine: 'Todo a cargo de ' + anchor.short,
    full_theirs: 'Todo a cargo de ' + other.short,
    settled: 'Pagaron ambos · saldado',
  }

  return (
    <>
      <div onClick={actions.closeEdit} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,32,.45)', animation: 'ccFade .2s ease', zIndex: 10 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderRadius: '28px 28px 0 0', padding: '10px 22px 26px', zIndex: 11, animation: 'ccUp .3s cubic-bezier(.22,1,.36,1)', boxShadow: '0 -20px 50px -20px rgba(15,23,42,.4)' }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: '#E2E8F0', margin: '6px auto 14px' }} />

        {panel == null && <Fields s={s} g={g} dr={dr} actions={actions} splitLabels={splitLabels} />}
        {panel === 'cat' && <CatPanel s={s} dr={dr} actions={actions} />}
        {panel === 'payer' && <PayerPanel s={s} g={g} dr={dr} actions={actions} />}
        {panel === 'method' && <MethodPanel s={s} dr={dr} actions={actions} />}
        {panel === 'split' && <SplitPanel dr={dr} splitLabels={splitLabels} actions={actions} />}
        {panel === 'participants' && <ParticipantsPanel g={g} dr={dr} actions={actions} />}
      </div>
    </>
  )
}

function Fields({ s, g, dr, actions, splitLabels }) {
  const cat = catById(s, dr.categoryId)
  const payer = memberById(s, g.id, dr.payerId)
  const meth = s.methods.find((x) => x.id === dr.methodId)
  return (
    <div style={{ animation: 'ccFade .15s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 19, letterSpacing: '-0.01em', color: '#0B1220' }}>Editar gasto</div>
          <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 700 }}>{g.name}</div>
        </div>
        <div onClick={actions.closeEdit} style={{ width: 30, height: 30, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Close size={15} color="#64748B" /></div>
      </div>

      <div style={label}>CATEGORÍA</div>
      <div onClick={() => actions.openPanel('cat')} style={{ ...fieldBox, padding: '9px 11px', marginBottom: 18 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: '#EAF8F3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{cat.icon}</div>
        <span style={{ flex: 1, fontWeight: 800, fontSize: 14.5, color: '#0B1220' }}>{cat.name}</span>
        <ChevronDown size={18} color="#94A3B8" w={2.6} />
      </div>

      <div style={label}>MONTO</div>
      <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '6px 14px', marginBottom: 12 }}>
        <span className="num" style={{ fontSize: 24, fontWeight: 700, color: '#94A3B8' }}>{dr.currency === 'USD' ? 'US$' : dr.currency === 'CLP' ? 'CLP$' : '$'}</span>
        <input value={dr.amount} onChange={(e) => actions.onAmount(e.target.value)} inputMode="numeric" className="num" style={{ flex: 1, border: 'none', outline: 'none', fontSize: 26, fontWeight: 700, color: '#0B1220', letterSpacing: '-0.01em', marginLeft: 4, width: '100%', background: 'transparent' }} />
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {['ARS', 'USD', 'CLP'].map((cu) => {
          const on = (dr.currency || 'ARS') === cu
          return (
            <button key={cu} onClick={() => actions.pickCurrency(cu)} style={{ flex: 1, border: on ? '1.5px solid #7C3AED' : '1.5px solid #E2E8F0', background: on ? '#F1ECFD' : '#fff', color: on ? '#7C3AED' : '#64748B', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, padding: '8px', borderRadius: 11, cursor: 'pointer' }}>{cu}</button>
          )
        })}
      </div>

      {g.personal ? (
        <>
          <div style={label}>MEDIO DE PAGO <span style={{ color: '#C3CCDA' }}>(opcional)</span></div>
          <div onClick={() => actions.openPanel('method')} style={{ ...fieldBox, padding: '9px 11px', marginBottom: 20 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>{meth ? meth.icon : '💳'}</div>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{meth ? meth.name : 'Sin especificar'}</span>
            <ChevronDown size={18} color="#94A3B8" w={2.6} />
          </div>
        </>
      ) : (
        <>
          <div style={label}>QUIÉN PAGÓ</div>
          <div onClick={() => actions.openPanel('payer')} style={{ ...fieldBox, padding: '8px 11px', marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: payer.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>{payer.initial}</div>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{payer.name}</span>
            <ChevronDown size={18} color="#94A3B8" w={2.6} />
          </div>
          <div style={label}>CÓMO SE DIVIDE</div>
          <div onClick={() => actions.openPanel('split')} style={{ ...fieldBox, padding: 11, marginBottom: g.members.length > 2 && (dr.mode || 'group') === 'group' ? 14 : 20 }}>
            <SplitIcon />
            <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{splitLabels[dr.mode || 'group']}</span>
            <ChevronDown size={18} color="#94A3B8" w={2.6} />
          </div>
          {g.members.length > 2 && (dr.mode || 'group') === 'group' && (() => {
            const inc = g.members.length - (dr.excluded || []).length
            return (
              <>
                <div style={label}>PARTICIPANTES</div>
                <div onClick={() => actions.openPanel('participants')} style={{ ...fieldBox, padding: 11, marginBottom: 20 }}>
                  <span style={{ fontSize: 16 }}>👥</span>
                  <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{inc === g.members.length ? 'Participan todos' : inc + ' de ' + g.members.length + ' participan'}</span>
                  <ChevronDown size={18} color="#94A3B8" w={2.6} />
                </div>
              </>
            )
          })()}
        </>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={actions.onDelete} style={{ width: 50, border: '1.5px solid #FBD0DC', background: '#FDEEF0', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Trash /></button>
        <button onClick={actions.closeEdit} style={{ flex: 1, border: 'none', background: BRAND_GRADIENT, borderRadius: 13, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 14.5, color: '#fff', cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(59,130,246,.6)' }}>Listo</button>
      </div>
      <div style={{ textAlign: 'center', fontSize: 11, color: '#B6BFCC', fontWeight: 700, marginTop: 12 }}>
        ✓ Los cambios se guardan solos
        {(dr.createdBy || dr.editedBy) && (
          <div style={{ marginTop: 2 }}>{dr.createdBy ? 'Cargado por ' + dr.createdBy : ''}{dr.editedBy ? ' · editado por ' + dr.editedBy : ''}</div>
        )}
      </div>
    </div>
  )
}

const PanelHeader = ({ title, onBack }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
    <div onClick={onBack} style={{ width: 32, height: 32, borderRadius: '50%', background: '#F1F4F9', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}><Back size={18} color="#475569" /></div>
    <span style={{ fontWeight: 800, fontSize: 17, color: '#0B1220' }}>{title}</span>
  </div>
)
const SearchBox = ({ value, onChange, placeholder }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F4F6FA', borderRadius: 12, padding: '10px 13px', marginBottom: 12 }}>
    <Search />
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontWeight: 700, fontSize: 14, color: '#0B1220', width: '100%', fontFamily: 'inherit' }} />
  </div>
)

function CatPanel({ s, dr, actions }) {
  const q = s.catQuery.trim().toLowerCase()
  const list = s.categories.filter((ct) => !q || ct.name.toLowerCase().includes(q))
  const showCreate = !!q && !s.categories.some((ct) => ct.name.toLowerCase() === q)
  const createLabel = s.catQuery.trim()
  const chosenIcon = s.newCatIcon || guessIcon(createLabel) // el elegido manualmente, o el sugerido por el nombre
  return (
    <div style={{ animation: 'ccScr .22s ease' }}>
      <PanelHeader title="Categoría" onBack={actions.backToFields} />
      <SearchBox value={s.catQuery} onChange={actions.onCatQuery} placeholder="Buscar o crear categoría…" />
      <div style={{ maxHeight: 300, overflowY: 'auto' }}>
        {showCreate && (
          <>
            <div onClick={actions.onCreateCat} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 9px', borderRadius: 12, background: '#F1ECFD', marginBottom: 6, cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{chosenIcon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#7C3AED' }}>Crear «{createLabel}»</div>
                <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>Elegí un icono y tocá para crear</div>
              </div>
              <Plus size={18} color="#7C3AED" w={2.6} />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '2px 2px 10px', marginBottom: 6, borderBottom: '1px solid #F1F4F9' }}>
              {CATEGORY_ICONS.map((ic) => {
                const on = chosenIcon === ic
                return (
                  <button key={ic} onClick={() => actions.setNewCatIcon(ic)} style={{ width: 36, height: 36, borderRadius: 10, border: on ? '2px solid #7C3AED' : '1.5px solid #E2E8F0', background: on ? '#F1ECFD' : '#fff', fontSize: 18, lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>{ic}</button>
                )
              })}
            </div>
          </>
        )}
        {list.map((ct) => (
          <div key={ct.id} onClick={() => actions.pickCat(ct.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 9px', borderRadius: 11, cursor: 'pointer' }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{ct.icon}</span>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#334155' }}>{ct.name}</span>
            {ct.id === dr.categoryId && <Check size={17} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function PayerPanel({ s, g, dr, actions }) {
  const pq = s.payerQuery.trim().toLowerCase()
  const list = g.members.filter((m) => !pq || m.name.toLowerCase().includes(pq) || m.short.toLowerCase().includes(pq))
  return (
    <div style={{ animation: 'ccScr .22s ease' }}>
      <PanelHeader title="Quién pagó" onBack={actions.backToFields} />
      <SearchBox value={s.payerQuery} onChange={actions.onPayerQuery} placeholder="Buscar persona…" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {list.map((m) => (
          <div key={m.id} onClick={() => actions.pickPayerEdit(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 9px', borderRadius: 11, cursor: 'pointer' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: m.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13 }}>{m.initial}</div>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{m.name}</span>
            {m.id === dr.payerId && <Check size={17} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function MethodPanel({ s, dr, actions }) {
  const mq = s.methodQuery.trim().toLowerCase()
  const list = [{ id: null, name: 'Sin especificar', icon: '🚫' }].concat(s.methods.filter((x) => !x.archived)).filter((x) => !mq || x.name.toLowerCase().includes(mq))
  return (
    <div style={{ animation: 'ccScr .22s ease' }}>
      <PanelHeader title="Medio de pago" onBack={actions.backToFields} />
      <SearchBox value={s.methodQuery} onChange={actions.onMethodQuery} placeholder="Buscar medio…" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {list.map((x) => (
          <div key={x.id || 'none'} onClick={() => actions.pickMethod(x.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 9px', borderRadius: 11, cursor: 'pointer' }}>
            <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{x.icon}</span>
            <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#334155' }}>{x.name}</span>
            {(x.id || null) === (dr.methodId || null) && <Check size={17} />}
          </div>
        ))}
      </div>
    </div>
  )
}

function ParticipantsPanel({ g, dr, actions }) {
  const excluded = dr.excluded || []
  return (
    <div style={{ animation: 'ccScr .22s ease' }}>
      <PanelHeader title="Participantes" onBack={actions.backToFields} />
      <div style={{ fontSize: 12.5, color: '#94A3B8', fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>Quiénes participan de este gasto. Los que saques no pagan su parte y se reparte entre el resto.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {g.members.map((m) => {
          const on = !excluded.includes(m.id)
          return (
            <div key={m.id} onClick={() => actions.toggleParticipant(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 9px', borderRadius: 11, cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: m.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, opacity: on ? 1 : 0.4 }}>{m.initial}</div>
              <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: on ? '#0B1220' : '#94A3B8' }}>{m.name}</span>
              <span style={{ width: 22, height: 22, borderRadius: 7, border: on ? 'none' : '1.5px solid #CBD5E1', background: on ? '#7C3AED' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on && <Check size={14} color="#fff" w={3.4} />}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SplitPanel({ dr, splitLabels, actions }) {
  const opts = ['group', 'full_mine', 'full_theirs', 'settled'].map((k) => ({ k, label: splitLabels[k] }))
  const cur = dr.mode || 'group'
  return (
    <div style={{ animation: 'ccScr .22s ease' }}>
      <PanelHeader title="Cómo se divide" onBack={actions.backToFields} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {opts.map((o) => (
          <div key={o.k} onClick={() => actions.pickMode(o.k)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 11px', borderRadius: 11, cursor: 'pointer', background: cur === o.k ? '#F6F8FC' : 'transparent' }}>
            <span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{o.label}</span>
            {cur === o.k && <Check size={17} />}
          </div>
        ))}
      </div>
    </div>
  )
}
