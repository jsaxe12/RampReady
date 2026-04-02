import { createContext, useContext, useState, useCallback } from 'react'
import { INITIAL_MOVEMENTS, INITIAL_FUEL_PRICES } from '../data/seed'

const FBOContext = createContext(null)

export function FBOProvider({ children }) {
  const [movements, setMovements] = useState(INITIAL_MOVEMENTS)
  const [fuelPrices, setFuelPrices] = useState(INITIAL_FUEL_PRICES)

  const inbound = movements.filter((m) => m.direction === 'inbound')
  const outbound = movements.filter((m) => m.direction === 'outbound')
  const pendingInbound = inbound.filter((a) => a.status === 'pending')
  const confirmedInbound = inbound.filter((a) => a.status === 'confirmed')

  const confirmArrival = useCallback((id) => {
    setMovements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'confirmed' } : a))
    )
  }, [])

  const declineArrival = useCallback((id) => {
    setMovements((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const markReady = useCallback((id) => {
    setMovements((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: 'ready' } : a))
    )
  }, [])

  const markDeparted = useCallback((id) => {
    setMovements((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const addMovement = useCallback((movement) => {
    setMovements((prev) => [...prev, movement])
  }, [])

  const sendMessage = useCallback((id, message) => {
    setMovements((prev) =>
      prev.map((a) =>
        a.id === id
          ? { ...a, messages: [...(a.messages || []), { from: 'fbo', text: message, time: new Date() }] }
          : a
      )
    )
  }, [])

  const updateFuelPrice = useCallback((type, price) => {
    setFuelPrices((prev) => ({
      ...prev,
      [type]: price,
      lastUpdated: new Date(),
    }))
  }, [])

  return (
    <FBOContext.Provider
      value={{
        movements,
        inbound,
        outbound,
        pendingInbound,
        confirmedInbound,
        addMovement,
        confirmArrival,
        declineArrival,
        markReady,
        markDeparted,
        sendMessage,
        fuelPrices,
        updateFuelPrice,
      }}
    >
      {children}
    </FBOContext.Provider>
  )
}

export function useFBO() {
  const ctx = useContext(FBOContext)
  if (!ctx) throw new Error('useFBO must be used within FBOProvider')
  return ctx
}
