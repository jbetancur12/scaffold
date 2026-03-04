import React, { useState, useEffect } from 'react';
import { Settings, Plus, Trash2, Calculator, Info, Ruler, Scissors, ChevronDown, Layers } from 'lucide-react';

const MACHINE_TYPES = {
  plana_1: {
    name: "Plana (1 Aguja - 301)",
    factor: 2.8,
    description: "Puntada cerrada estándar",
    threads: 2,
    needles: 1
  },
  plana_2: {
    name: "Plana (2 Agujas - 301)",
    factor: 5.6,
    description: "Doble pespunte paralelo",
    threads: 4,
    needles: 2
  },
  zigzadora: {
    name: "Zigzadora (304)",
    factor: 6.5,
    description: "Unión de materiales elásticos",
    threads: 2,
    needles: 1
  },
  fileteadora_3: {
    name: "Fileteadora (3 Hilos - 504)",
    factor: 12.5,
    description: "1 Aguja + 2 Loopers (Sobrehilado)",
    threads: 3,
    needles: 1
  },
  fileteadora_4: {
    name: "Fileteadora (4 Hilos - 514)",
    factor: 15.5,
    description: "2 Agujas + 2 Loopers (Refuerzo)",
    threads: 4,
    needles: 2
  },
  fileteadora_5: {
    name: "Fileteadora (5 Hilos - 516)",
    factor: 19.5,
    description: "2 Agujas + 3 Loopers (Puntada Seguridad)",
    threads: 5,
    needles: 2
  },
  flatseamer: {
    name: "Flatseamer (607)",
    factor: 32.0,
    description: "4 Agujas + 1 Looper + 1 Recubridor",
    threads: 6,
    needles: 4
  },
  reboteadora: {
    name: "Reboteadora / Recubridora",
    factor: 14.0,
    description: "2 Agujas + 1 Looper (Ribeteado)",
    threads: 3,
    needles: 2
  }
};

const App = () => {
  const [operations, setOperations] = useState([]);
  const [currentOp, setCurrentOp] = useState({
    id: null,
    name: '',
    machine: 'plana_1',
    length: '',
    waste: 15
  });

  const addOperation = () => {
    if (!currentOp.length || currentOp.length <= 0) return;
    
    const machineConfig = MACHINE_TYPES[currentOp.machine];
    // El factor ya incluye el consumo de todos los hilos de esa configuración
    const consumption = (currentOp.length * machineConfig.factor * (1 + currentOp.waste / 100)) / 100;

    const newOp = {
      ...currentOp,
      id: Date.now(),
      consumption: consumption.toFixed(2),
      machineName: machineConfig.name,
      details: `${machineConfig.threads} hilos / ${machineConfig.needles} aguja(s)`
    };

    setOperations([...operations, newOp]);
    setCurrentOp({
      ...currentOp,
      id: null,
      name: '',
      length: '',
    });
  };

  const removeOperation = (id) => {
    setOperations(operations.filter(op => op.id !== id));
  };

  const totalConsumption = operations.reduce((acc, op) => acc + parseFloat(op.consumption), 0).toFixed(2);
  const totalYards = (totalConsumption * 1.09361).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto">
        {/* Header con Branding */}
        <header className="bg-slate-900 text-white p-6 rounded-t-2xl shadow-xl border-b-4 border-blue-500 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight italic">COLORTOPEDICAS S.A.S.</h1>
            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest">Cálculo de Insumos • Producción</p>
          </div>
          <div className="hidden md:block text-right">
            <p className="text-[10px] text-slate-400">CONTROL DE CALIDAD</p>
            <p className="text-xs font-mono">APP-TH-2024</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          
          {/* Panel Lateral de Configuración */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-700">
                <Plus className="w-5 h-5 text-blue-600" /> Nueva Operación
              </h2>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Descripción de la Costura</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Pegado de Velcros"
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={currentOp.name}
                    onChange={(e) => setCurrentOp({...currentOp, name: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Configuración de Máquina</label>
                  <div className="relative">
                    <select 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg appearance-none focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                      value={currentOp.machine}
                      onChange={(e) => setCurrentOp({...currentOp, machine: e.target.value})}
                    >
                      {Object.entries(MACHINE_TYPES).map(([key, value]) => (
                        <option key={key} value={key}>{value.name}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-4 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-100 flex items-start gap-2">
                    <Info className="w-3 h-3 text-blue-500 mt-0.5" />
                    <p className="text-[10px] text-blue-700 leading-tight">
                      {MACHINE_TYPES[currentOp.machine].description}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Largo (cm)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        placeholder="0.0"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-bold text-center"
                        value={currentOp.length}
                        onChange={(e) => setCurrentOp({...currentOp, length: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2">Merma (%)</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-center font-bold"
                      value={currentOp.waste}
                      onChange={(e) => setCurrentOp({...currentOp, waste: e.target.value})}
                    />
                  </div>
                </div>

                <button 
                  onClick={addOperation}
                  disabled={!currentOp.length}
                  className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all shadow-lg ${
                    !currentOp.length 
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white transform active:scale-95'
                  }`}
                >
                  Calcular y Añadir
                </button>
              </div>
            </div>

            {/* Guía Rápida */}
            <div className="bg-slate-800 p-5 rounded-xl text-white">
              <h3 className="text-xs font-bold mb-3 flex items-center gap-2 text-blue-400">
                <Layers className="w-4 h-4" /> GUÍA DE CONFIGURACIÓN
              </h3>
              <div className="space-y-3 opacity-90">
                <div className="flex justify-between text-[10px] border-b border-slate-700 pb-1">
                  <span>Fileteadora 3H</span>
                  <span className="font-mono">1 Aguja</span>
                </div>
                <div className="flex justify-between text-[10px] border-b border-slate-700 pb-1">
                  <span>Fileteadora 4H</span>
                  <span className="font-mono">2 Agujas</span>
                </div>
                <div className="flex justify-between text-[10px] border-b border-slate-700 pb-1">
                  <span>Fileteadora 5H</span>
                  <span className="font-mono">2 Agujas (Refuerzo)</span>
                </div>
                <div className="flex justify-between text-[10px] border-b border-slate-700 pb-1">
                  <span>Flatseamer 6H</span>
                  <span className="font-mono">4 Agujas</span>
                </div>
              </div>
            </div>
          </div>

          {/* Listado de Costuras y Totales */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Cards de Totales Relevantes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-slate-400 text-[10px] font-black uppercase">Consumo Total Hilo</span>
                    <h3 className="text-4xl font-black text-slate-800 mt-1">{totalConsumption}<small className="text-lg font-medium ml-1">m</small></h3>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    <Calculator className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">Basado en metros lineales consumidos</p>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-md border-l-4 border-green-500">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-slate-400 text-[10px] font-black uppercase">Equivalente en Yardas</span>
                    <h3 className="text-4xl font-black text-slate-800 mt-1">{totalYards}<small className="text-lg font-medium ml-1">yd</small></h3>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg text-green-600">
                    <Scissors className="w-6 h-6" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-2 italic">Unidad de compra estándar</p>
              </div>
            </div>

            {/* Listado de Operaciones */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="font-bold text-slate-700 text-sm uppercase tracking-tight">Ficha de Operaciones</h2>
                <span className="text-[10px] font-black text-slate-400 px-3 py-1 bg-slate-200 rounded-full uppercase">
                  {operations.length} Items
                </span>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[9px] uppercase font-black border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Operación</th>
                      <th className="px-6 py-4">Configuración</th>
                      <th className="px-6 py-4 text-center">Largo</th>
                      <th className="px-6 py-4 text-right">Hilo (m)</th>
                      <th className="px-6 py-4 text-center">Eliminar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {operations.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center opacity-30">
                            <Ruler className="w-12 h-12 mb-2" />
                            <p className="text-sm font-medium italic">Agregue costuras para generar el cálculo</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      operations.map((op) => (
                        <tr key={op.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-6 py-4">
                            <p className="font-bold text-slate-700 text-sm uppercase leading-none">{op.name || "S/N"}</p>
                            <span className="text-[10px] text-slate-400 font-medium">Factor: {MACHINE_TYPES[op.machine].factor} • Merma: {op.waste}%</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                              {op.machineName.split('(')[0]}
                            </div>
                            <p className="text-[9px] text-slate-400 mt-1 uppercase font-semibold">{op.details}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-mono font-bold text-slate-600">
                            {op.length} cm
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-black text-slate-800">{op.consumption} m</span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button 
                              onClick={() => removeOperation(op.id)}
                              className="text-slate-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {operations.length > 0 && (
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-right">
                  <button 
                    onClick={() => setOperations([])}
                    className="text-[10px] font-black text-red-400 hover:text-red-600 uppercase tracking-tighter"
                  >
                    Borrar Ficha Actual
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-8 py-6 border-t border-slate-200 text-center">
          <p className="text-slate-400 text-[9px] uppercase font-bold tracking-[0.2em]">
            Departamento de Ingeniería de Procesos • Colortopedicas S.A.S.
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;