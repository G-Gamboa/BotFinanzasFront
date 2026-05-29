/**
 * API demo para usuarios no registrados.
 *
 * Las lecturas devuelven datos ficticios sin tocar el backend.
 * Las escrituras rechazan con un mensaje que invita a registrarse,
 * así el usuario ve cómo funciona la UI pero no puede persistir nada.
 */

const DEMO_MSG = 'Modo demo · Regístrate para guardar tus datos.'

const write = () => Promise.reject(new Error(DEMO_MSG))
const empty = (val = null) => () => Promise.resolve(val)

export function createDemoApi(demoData) {
  const {
    catalogos, dashboard, disponibles, deudas,
    historial, tcBalances, preferencias,
  } = demoData

  return {
    // ── Lectura: devuelve datos demo ──────────────────────────
    getHealth:            empty({ ok: true }),
    getCatalogos:         empty(catalogos),
    getDashboard:         empty(dashboard),
    getDisponibles:       empty(disponibles),
    getDeudas:            empty(deudas),
    getPreferencias:      empty(preferencias),
    getTCBalances:        empty(tcBalances),
    getInstallmentPlans:  empty({ items: [] }),
    getSavingsGoals:      empty({ items: [] }),
    getCuentas:           empty({ items: catalogos.accounts }),
    getCategoriasAdmin:   empty({ items: catalogos.categories }),
    getLoanPeopleAdmin:   empty({ items: [] }),
    getPrestamosView:     empty({ lent: [], borrowed: [] }),
    getHistorial:         empty(historial),
    getPeriodoResumen:    empty(null),
    getRegistrationStatus: empty({ registered: false, telegram_user_id: 0 }),
    processPendingCharges: empty({ total_created: 0 }),

    // ── Escritura: bloquea con mensaje demo ───────────────────
    postMovimiento:       write,
    postDeuda:            write,
    postPagarDeuda:       write,
    postCuenta:           write,
    patchCuenta:          write,
    activarCuenta:        write,
    desactivarCuenta:     write,
    postCategoria:        write,
    patchCategoria:       write,
    activarCategoria:     write,
    desactivarCategoria:  write,
    patchPreferencias:    write,
    anularMovimiento:     write,
    patchMovimiento:      write,
    anularLoanPayment:    write,
    anularDebtPayment:    write,
    postLoanPerson:       write,
    patchLoanPerson:      write,
    activarLoanPerson:    write,
    desactivarLoanPerson: write,
    patchDeuda:           write,
    postSavingsGoal:      write,
    patchSavingsGoal:     write,
    deleteSavingsGoal:    write,
    postTCPayment:        write,
    anularTCPayment:      write,
    postInstallmentPlan:  write,
    patchInstallmentPlan: write,
    deleteInstallmentPlan:write,
    migrateDebtToTC:      write,
    postRegistroInvoice:  write,

    // ── Betting: bloqueado en demo ───────────────────────────
    getBets:             write,
    postBet:             write,
    patchBet:            write,
    deleteBet:           write,
    patchBettingConfig:  write,

    // ── Admin: bloqueado en demo ──────────────────────────────
    getAdminUsuarios:     write,
    postCrearUsuario:     write,
    patchAdminUsuario:    write,
  }
}
