import { useState } from 'react'
import { Back, Plus, Chevron, Archive, Trash } from './icons'
import { BRAND_GRADIENT } from './initialState'
import { ledgerMonths } from './logic'
import { ExportBar } from './GroupViews'
import CurrencyPicker from './CurrencyPicker'
import { supabase } from '../supabase'
import { APP_VERSION } from '../version'

const cardShadow = '0 2px 10px -7px rgba(15,23,42,.3)'
const sectionLabel = { fontSize: 10.5, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.05em', marginBottom: 6 }
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const mesAno = (iso) => { if (!iso) return ''; const s = String(iso); return MESES[Number(s.slice(5, 7)) - 1] + ' de ' + s.slice(0, 4) }

/** Mi perfil: avatar, datos de cuenta, medios de pago, preferencias. */
export default function Profile({ s, actions }) {
  const prof = s.profile
  const profInitial = (prof.name.trim()[0] || 'D').toUpperCase()
  const personalMonths = s.groups.personal ? ledgerMonths(s, 'personal', true) : []
  // Crear / cambiar contraseña (para poder entrar con email+contraseña, ideal en iOS-PWA).
  const [pwd, setPwd] = useState('')
  const [pwdMsg, setPwdMsg] = useState(null) // { ok, text }
  const [pwdSaving, setPwdSaving] = useState(false)
  // recuerda (por dispositivo) si ya definiste una contraseña, para mostrar "cambiar" en vez de "definir"
  const [hasPwd, setHasPwd] = useState(() => localStorage.getItem('cc-haspwd') === '1')
  const savePwd = async () => {
    if (pwd.length < 6) { setPwdMsg({ ok: false, text: 'Mínimo 6 caracteres.' }); return }
    setPwdSaving(true); setPwdMsg(null)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    setPwdSaving(false)
    if (error) { setPwdMsg({ ok: false, text: error.message }); return }
    try { localStorage.setItem('cc-haspwd', '1') } catch { /* sin storage */ }
    setHasPwd(true)
    setPwdMsg({ ok: true, text: '✓ Contraseña guardada. Ya podés entrar con email y contraseña.' })
    setPwd('')
  }

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: '#FBFCFE', animation: 'ccIn .26s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 16px', borderBottom: '1px solid #EEF1F6' }}>
        <div onClick={actions.backToList} style={{ width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><Back size={20} /></div>
        <span style={{ fontWeight: 800, fontSize: 18 }}>Mi perfil</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '22px 18px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <div onClick={actions.onChangeProfilePhoto} className="num" style={{ position: 'relative', width: 88, height: 88, borderRadius: '50%', background: prof.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 34, cursor: 'pointer' }}>
            {profInitial}
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: '50%', background: '#7C3AED', border: '3px solid #FBFCFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff' }}>✎</div>
          </div>
          <div onClick={actions.onChangeProfilePhoto} style={{ fontSize: 12.5, fontWeight: 800, color: '#7C3AED', marginTop: 10, cursor: 'pointer' }}>Cambiar foto</div>
        </div>

        {prof.founderNumber && (
          <div style={{ position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', gap: 13, borderRadius: 16, padding: '13px 15px', marginBottom: 20, background: 'linear-gradient(135deg,#FDEBAB 0%,#F6CD63 50%,#E7AB34 100%)', border: '1px solid #E7BC5E', boxShadow: '0 4px 14px -8px rgba(199,138,30,.7), inset 0 1px 0 rgba(255,255,255,.55)' }}>
            <span aria-hidden="true" data-cc-shine style={{ position: 'absolute', top: 0, bottom: 0, width: '34%', background: 'linear-gradient(105deg,transparent,rgba(255,255,255,.65),transparent)', animation: 'ccShine 2.6s ease-in-out forwards' }} />
            <div style={{ position: 'relative', fontSize: 26, lineHeight: 1 }}>🏅</div>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#5C3C0B', letterSpacing: '-0.01em', lineHeight: 1.15 }}>Miembro fundador #{prof.founderNumber}</div>
              {prof.memberSince && <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9A7426', marginTop: 3 }}>Con nosotros desde {mesAno(prof.memberSince)}.</div>}
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#9A7426', marginTop: 1 }}>Gracias por acompañarnos desde el comienzo.</div>
            </div>
          </div>
        )}

        <div style={sectionLabel}>NOMBRE</div>
        <input value={prof.name} onChange={(e) => actions.onProfName(e.target.value)} style={{ border: '1.5px solid #E7EAF1', borderRadius: 13, padding: '12px 14px', outline: 'none', fontWeight: 800, fontSize: 16, color: '#0B1220', width: '100%', marginBottom: 18, fontFamily: 'inherit', boxSizing: 'border-box' }} />

        <div style={sectionLabel}>CUENTA</div>
        <div style={{ background: '#fff', border: '1px solid #EEF1F6', borderRadius: 14, overflow: 'hidden', marginBottom: 18, boxShadow: cardShadow }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', borderBottom: '1px solid #F1F4F9' }}>
            <span style={{ fontSize: 16 }}>✉️</span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>Email</div><div style={{ fontWeight: 700, fontSize: 14, color: '#0B1220' }}>{s.authEmail || prof.email}</div></div>
            <span style={{ fontSize: 10, fontWeight: 800, color: '#0E9F86', background: '#EAF8F3', padding: '3px 8px', borderRadius: 999 }}>Verificado</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px' }}>
            <span style={{ fontSize: 16 }}>👤</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>Usuario</div><div style={{ fontWeight: 700, fontSize: 14, color: '#0B1220' }}>@{s.me || (prof.name || '').trim().toLowerCase().split(' ')[0] || 'usuario'}</div></div>
          </div>
        </div>

        <div style={sectionLabel}>{hasPwd ? 'CAMBIAR CONTRASEÑA' : 'CONTRASEÑA'}</div>
        <div style={{ background: '#fff', border: '1px solid #EEF1F6', borderRadius: 14, padding: 14, marginBottom: 18, boxShadow: cardShadow }}>
          {hasPwd
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#0E9F86', fontWeight: 700, marginBottom: 10 }}>✓ Tenés una contraseña activa. Podés cambiarla acá.</div>
            : <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 600, lineHeight: 1.45, marginBottom: 10 }}>Definí una contraseña para entrar con email + contraseña (recomendado para la app instalada en el celular).</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={pwd} onChange={(e) => { setPwd(e.target.value); setPwdMsg(null) }} onKeyDown={(e) => e.key === 'Enter' && savePwd()} type="password" autoComplete="new-password" placeholder={hasPwd ? 'Nueva contraseña (mín. 6)' : 'Contraseña (mín. 6)'} style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 11, padding: '10px 12px', outline: 'none', fontWeight: 600, fontSize: 14, color: '#0B1220', background: '#fff', fontFamily: 'inherit', minWidth: 0 }} />
            <button onClick={savePwd} disabled={pwdSaving || pwd.length < 6} style={{ border: 'none', background: pwdSaving || pwd.length < 6 ? '#CBD5E1' : '#7C3AED', color: '#fff', borderRadius: 11, padding: '10px 14px', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: pwdSaving || pwd.length < 6 ? 'not-allowed' : 'pointer', flexShrink: 0 }}>{pwdSaving ? '…' : hasPwd ? 'Actualizar' : 'Guardar'}</button>
          </div>
          {pwdMsg && <div style={{ fontSize: 12, fontWeight: 700, color: pwdMsg.ok ? '#0E9F86' : '#E11D5B', marginTop: 8, lineHeight: 1.4 }}>{pwdMsg.text}</div>}
        </div>

        <div style={sectionLabel}>MEDIOS DE PAGO</div>
        <div style={{ background: '#fff', border: '1px solid #EEF1F6', borderRadius: 14, overflow: 'hidden', marginBottom: 18, boxShadow: cardShadow }}>
          {s.methods.map((m) => (
            <div key={m.id} onClick={() => actions.openProfMethod(m.id)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderBottom: '1px solid #F1F4F9', cursor: 'pointer' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{m.icon}</div>
              <span style={{ fontWeight: 700, fontSize: 14, color: '#0B1220' }}>{m.name}</span>
              {m.archived && <span style={{ fontSize: 9.5, fontWeight: 800, color: '#94A3B8', background: '#F1F4F9', padding: '3px 7px', borderRadius: 999 }}>ARCHIVADO</span>}
              <span style={{ flex: 1 }} />
              <Chevron size={17} color="#C3CCDA" />
            </div>
          ))}
          {s.addingProfMethod ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px' }}>
              <input value={s.newProfMethodName} onChange={(e) => actions.onNewProfMethodName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && actions.onConfirmProfMethod()} placeholder="Ej: Visa Galicia crédito" style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '9px 11px', outline: 'none', fontWeight: 700, fontSize: 13.5, color: '#0B1220', width: '100%', fontFamily: 'inherit' }} />
              <button onClick={actions.onConfirmProfMethod} style={{ border: 'none', background: '#7C3AED', color: '#fff', borderRadius: 10, padding: '9px 14px', fontFamily: 'inherit', fontWeight: 800, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>Añadir</button>
            </div>
          ) : (
            <div onClick={actions.onAddProfMethod} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', color: '#7C3AED', cursor: 'pointer' }}>
              <Plus size={17} color="#7C3AED" /><span style={{ fontWeight: 800, fontSize: 13.5 }}>Agregar medio de pago</span>
            </div>
          )}
        </div>

        <div style={sectionLabel}>MONEDA POR DEFECTO</div>
        <div style={{ marginBottom: 8 }}>
          <CurrencyPicker value={prof.currency || 'ARS'} onChange={actions.setCurrency} />
        </div>
        <div style={{ fontSize: 11.5, color: '#94A3B8', fontWeight: 600, marginBottom: 22, lineHeight: 1.4 }}>
          Es la moneda que se usa al cargar un gasto sin aclarar otra. Podés cambiarla cuando quieras; los gastos ya cargados no se modifican.
        </div>

        <div style={sectionLabel}>PREFERENCIAS</div>
        <div style={{ background: '#fff', border: '1px solid #EEF1F6', borderRadius: 14, overflow: 'hidden', marginBottom: 22, boxShadow: cardShadow }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px' }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <div style={{ flex: 1, fontWeight: 700, fontSize: 14, color: '#0B1220' }}>Notificaciones</div>
            <div style={{ width: 42, height: 24, borderRadius: 999, background: '#7C3AED', position: 'relative' }}><div style={{ position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff' }} /></div>
          </div>
        </div>

        {personalMonths.length > 0 && (
          <>
            <div style={sectionLabel}>EXPORTAR MIS GASTOS</div>
            <div style={{ marginBottom: 22 }}>
              <ExportBar s={s} gid="personal" monthKeys={personalMonths} />
            </div>
          </>
        )}

        <div onClick={actions.signOut} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, border: '1.5px solid #FBD0DC', background: '#FDEEF0', borderRadius: 13, padding: 13, cursor: 'pointer' }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#E11D5B' }}>Cerrar sesión</span>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#C3CCDA', marginTop: 18 }}>Cuentas Claras · v{APP_VERSION}</div>
      </div>

      {s.profMethodEdit != null && <MethodEditSheet s={s} actions={actions} />}
    </div>
  )
}

/** Hoja para renombrar / archivar / eliminar un medio de pago. */
function MethodEditSheet({ s, actions }) {
  const meth = s.methods.find((x) => x.id === s.profMethodEdit)
  if (!meth) return null
  const count = (s.ledgers.personal || []).filter((e) => (e.methodId || null) === meth.id).length
  const countText = count + (count === 1 ? ' gasto asociado' : ' gastos asociados')
  return (
    <>
      <div onClick={actions.closeProfMethod} style={{ position: 'absolute', inset: 0, background: 'rgba(11,18,32,.45)', animation: 'ccFade .2s ease', zIndex: 20 }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, background: '#fff', borderRadius: '28px 28px 0 0', padding: '10px 22px 26px', zIndex: 21, animation: 'ccUp .3s cubic-bezier(.22,1,.36,1)', boxShadow: '0 -20px 50px -20px rgba(15,23,42,.4)' }}>
        <div style={{ width: 40, height: 5, borderRadius: 999, background: '#E2E8F0', margin: '6px auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F4F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{meth.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#0B1220' }}>Medio de pago</div>
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.04em', marginBottom: 7 }}>NOMBRE</div>
        <input value={s.profMethodName} onChange={(e) => actions.onProfMethodName(e.target.value)} style={{ border: '1.5px solid #E2E8F0', borderRadius: 13, padding: '11px 13px', outline: 'none', fontWeight: 800, fontSize: 15, color: '#0B1220', width: '100%', marginBottom: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />

        <div onClick={actions.toggleArchiveProfMethod} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 14px', border: '1.5px solid #E2E8F0', borderRadius: 13, marginBottom: 10, cursor: 'pointer' }}>
          <Archive size={18} color="#475569" /><span style={{ flex: 1, fontWeight: 800, fontSize: 14, color: '#0B1220' }}>{meth.archived ? 'Desarchivar medio' : 'Archivar medio'}</span>
        </div>

        {count > 0 ? (
          <div style={{ background: '#FEF8EF', border: '1px solid #FBE4C2', borderRadius: 13, padding: '12px 13px', marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#B45309', lineHeight: 1.4, marginBottom: 10 }}>Tiene {countText}. No se puede eliminar — archivalo, o eliminá primero sus gastos.</div>
            <button onClick={actions.deleteMethodExpenses} style={{ width: '100%', border: '1.5px solid #FBD0DC', background: '#FDEEF0', borderRadius: 11, padding: 11, fontFamily: 'inherit', fontWeight: 800, fontSize: 13, color: '#E11D5B', cursor: 'pointer' }}>Eliminar gastos asociados</button>
          </div>
        ) : (
          <div onClick={actions.deleteProfMethod} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1.5px solid #FBD0DC', background: '#FDEEF0', borderRadius: 13, padding: 12, cursor: 'pointer', marginBottom: 10 }}>
            <Trash size={17} /><span style={{ fontWeight: 800, fontSize: 14, color: '#E11D5B' }}>Eliminar medio de pago</span>
          </div>
        )}

        <button onClick={actions.saveProfMethod} style={{ width: '100%', border: 'none', background: BRAND_GRADIENT, borderRadius: 13, padding: 13, fontFamily: 'inherit', fontWeight: 800, fontSize: 14.5, color: '#fff', cursor: 'pointer', boxShadow: '0 8px 20px -8px rgba(59,130,246,.6)' }}>Guardar</button>
      </div>
    </>
  )
}
