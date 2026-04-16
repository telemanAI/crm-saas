{/* Info Pratica */}
<motion.div 
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6"
>
  <div className="flex items-center gap-3 mb-6">
    <div className="w-10 h-10 rounded-xl bg-cyan-600/20 text-cyan-400 flex items-center justify-center">
      <FileText className="w-5 h-5" />
    </div>
    <h2 className="text-xl font-semibold text-white">Info Pratica</h2>
  </div>

  <div className="space-y-4">
    {practice.offerName && (
      <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 mb-4">
        {/* ... contenuto offerta ... */}
      </div>
    )}

    <div>
      <label className="text-sm text-slate-500 block mb-1">Tipo Offerta</label>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${
          practice.type === 'TIM_FIBRA' ? 'bg-blue-500' : 
          practice.type === 'VODAFONE' ? 'bg-rose-500' :
          practice.type === 'WINDTRE' ? 'bg-orange-500' :
          practice.type === 'ILIAD' ? 'bg-red-500' :
          practice.type === 'OPTIMA' ? 'bg-emerald-500' :
          practice.type === 'IREN' ? 'bg-amber-500' :
          'bg-cyan-500'
        }`} />
        <span className="text-white font-medium">
          {practice.type === 'TIM_FIBRA' ? 'TIM Fibra' : 
           practice.type === 'VODAFONE' ? 'Vodafone' :
           practice.type === 'WINDTRE' ? 'WindTre' :
           practice.type === 'ILIAD' ? 'Iliad' :
           practice.type === 'OPTIMA' ? 'Optima' :
           practice.type === 'IREN' ? 'Iren' :
           practice.type === 'SKY' ? 'SKY' :
           practice.type}
        </span>
      </div>
    </div>
    
    {practice.offerCode && (
      <div>
        <label className="text-sm text-slate-500 block mb-1">Codice Offerta</label>
        <p className="text-white font-mono text-sm bg-slate-800/50 px-2 py-1 rounded inline-block">
          {practice.offerCode}
        </p>
      </div>
    )}
    
    {practice.soldBy && (
      <div>
        <label className="text-sm text-slate-500 block mb-1">Venduto Da</label>
        <p className="text-white">{practice.soldBy}</p>
      </div>
    )}
    
    {practice.enteredBy && (
      <div>
        <label className="text-sm text-slate-500 block mb-1">Inserito Da</label>
        <p className="text-white">{practice.enteredBy}</p>
      </div>
    )}

    {/* DATI CLIENTE */}
    {customerData && (
      <div className="border-t border-slate-700 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-blue-400 mb-3 flex items-center gap-2">
          <User className="w-4 h-4" />
          Dati Cliente
        </h4>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Nome:</span>
            <span className="text-white">
              {customerData.firstName} {customerData.lastName}
            </span>
          </div>
          
          {customerData.fiscalCode && (
            <div className="flex justify-between">
              <span className="text-slate-400">CF:</span>
              <span className="text-white font-mono text-xs">
                {customerData.fiscalCode}
              </span>
            </div>
          )}
          
          {customerData.phonePrimary && (
            <div className="flex justify-between">
              <span className="text-slate-400">Telefono:</span>
              <span className="text-white">
                {customerData.phonePrimary}
              </span>
            </div>
          )}
          
          {customerData.email && (
            <div className="flex justify-between">
              <span className="text-slate-400">Email:</span>
              <span className="text-white">
                {customerData.email}
              </span>
            </div>
          )}

          {/* 🔥 CORRETTO: Type assertion sui campi business */}
          {((customerData as any).ragioneSociale) && (
            <div className="border-t border-slate-700/50 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Ragione Sociale:</span>
                <span className="text-white">{(customerData as any).ragioneSociale}</span>
              </div>
              {(customerData as any).partitaIva && (
                <div className="flex justify-between mt-1">
                  <span className="text-slate-400">P.IVA:</span>
                  <span className="text-white font-mono text-xs">{(customerData as any).partitaIva}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}

    {/* INDIRIZZO INSTALLAZIONE - NUOVO BLOCCO CON COMUNE, CITTA, CAP */}
    {practice.installationAddress && (
      <div className="border-t border-slate-700 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Indirizzo Installazione
        </h4>
        
        <div className="space-y-2 text-sm">
          {practice.installationAddress.street && (
            <div className="flex justify-between">
              <span className="text-slate-400">Indirizzo:</span>
              <span className="text-white text-right max-w-[60%]">
                {practice.installationAddress.street}
              </span>
            </div>
          )}
          
          {practice.installationAddress.comune && (
            <div className="flex justify-between">
              <span className="text-slate-400">Comune:</span>
              <span className="text-white">{practice.installationAddress.comune}</span>
            </div>
          )}
          
          {practice.installationAddress.citta && (
            <div className="flex justify-between">
              <span className="text-slate-400">Città:</span>
              <span className="text-white">{practice.installationAddress.citta}</span>
            </div>
          )}
          
          {practice.installationAddress.cap && (
            <div className="flex justify-between">
              <span className="text-slate-400">CAP:</span>
              <span className="text-white font-mono">{practice.installationAddress.cap}</span>
            </div>
          )}
        </div>
      </div>
    )}

    {/* SEZIONE CONVERGENZA */}
    {practice.convergenza?.attiva && (
      <div className="border-t border-slate-700 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-indigo-400 mb-3 flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${practice.statoGlobale === 'completo' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          Convergenza {practice.statoGlobale === 'completo' ? 'Completata' : 'Da Chiudere'}
        </h4>
        
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Tipo:</span>
            <span className="text-white">{practice.convergenza.tipo === 'daChiudere' ? 'Da Chiudere' : 'Chiusa'}</span>
          </div>
          
          {practice.convergenza.tipo === 'chiusa' && practice.convergenza.numero && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Numero:</span>
              <span className="text-white font-mono">{practice.convergenza.numero}</span>
            </div>
          )}
          
          {practice.convergenza.tipo === 'daChiudere' && (
            <div className="space-y-2">
              <label className="text-xs text-amber-400 block">
                Inserisci numero da convergere per completare:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={convergenzaNumero}
                  onChange={(e) => setConvergenzaNumero(e.target.value)}
                  placeholder="Numero o codice"
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button
                  onClick={async () => {
                    if (!convergenzaNumero.trim()) return;
                    setSavingConvergenza(true);
                    try {
                      await api.patch(`/practices/${id}/convergence`, {
                        numero: convergenzaNumero
                      }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      fetchPractice();
                      setConvergenzaNumero('');
                      alert('Numero convergenza aggiornato! Pratica completata.');
                    } catch (err) {
                      alert('Errore salvataggio numero convergenza');
                    } finally {
                      setSavingConvergenza(false);
                    }
                  }}
                  disabled={savingConvergenza || !convergenzaNumero.trim()}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {savingConvergenza ? '...' : '✓'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* LAVORAZIONI POST ATTIVAZIONE */}
    {practice.lavorazioniPostAttivazione && (
      <div className="border-t border-slate-700 pt-4 mt-4">
        <h4 className="text-sm font-semibold text-slate-300 mb-2">Lavorazioni Post Attivazione</h4>
        <p className="text-sm text-slate-400 bg-slate-950/50 p-3 rounded-lg border border-slate-800">
          {practice.lavorazioniPostAttivazione}
        </p>
      </div>
    )}

    <div className="pt-4 border-t border-slate-800">
      <label className="text-sm text-slate-500 block mb-1">Data Creazione</label>
      <p className="text-white text-sm">
        {new Date(practice.createdAt).toLocaleDateString('it-IT', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}
      </p>
    </div>
    
    {practice.updatedAt !== practice.createdAt && (
      <div>
        <label className="text-sm text-slate-500 block mb-1">Ultima Modifica</label>
        <p className="text-white text-sm">
          {new Date(practice.updatedAt).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    )}
  </div>
</motion.div>