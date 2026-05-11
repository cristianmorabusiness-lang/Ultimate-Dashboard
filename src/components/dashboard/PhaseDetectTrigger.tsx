'use client'

import { useEffect } from 'react'

export function PhaseDetectTrigger() {
  useEffect(() => {
    fetch('/api/phase/detect', { method: 'POST' }).catch(() => {})
  }, [])
  return null
}
