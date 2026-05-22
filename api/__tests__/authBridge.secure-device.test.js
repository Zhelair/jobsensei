import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ensureSecureDeviceAccess } from '../_lib/authBridge.js'

function createDeviceSupabaseMock({ rows, upsertedRow }) {
  const calls = {
    upsert: [],
  }

  return {
    calls,
    from(table) {
      expect(table).toBe('device_registrations')

      return {
        select() {
          return {
            eq(column, value) {
              expect(column).toBe('user_id')
              expect(value).toBe('user-1')
              return Promise.resolve({ data: rows, error: null })
            },
          }
        },
        upsert(payload, options) {
          calls.upsert.push({ payload, options })

          return {
            select() {
              return {
                single() {
                  return Promise.resolve({ data: upsertedRow, error: null })
                },
              }
            },
          }
        },
      }
    },
  }
}

describe('ensureSecureDeviceAccess', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-22T12:00:00.000Z'))
  })

  it('re-approves a previously revoked device after the cooldown expires when a slot is open', async () => {
    const rows = [
      {
        id: 'device-current',
        device_id: 'js-phone',
        device_name: 'Android - Chrome',
        device_label: '',
        approved_at: '2026-05-20T08:00:00.000Z',
        revoked_at: '2026-05-22T01:00:00.000Z',
        last_seen_at: '2026-05-22T01:00:00.000Z',
        created_at: '2026-05-20T08:00:00.000Z',
      },
      {
        id: 'device-other',
        device_id: 'js-laptop',
        device_name: 'Windows - Chrome',
        device_label: '',
        approved_at: '2026-05-21T09:00:00.000Z',
        revoked_at: null,
        last_seen_at: '2026-05-22T10:30:00.000Z',
        created_at: '2026-05-21T09:00:00.000Z',
      },
    ]

    const supabase = createDeviceSupabaseMock({
      rows,
      upsertedRow: {
        ...rows[0],
        approved_at: '2026-05-22T12:00:00.000Z',
        revoked_at: null,
        last_seen_at: '2026-05-22T12:00:00.000Z',
      },
    })

    const result = await ensureSecureDeviceAccess({
      supabase,
      user: { id: 'user-1' },
      deviceId: 'js-phone',
      deviceName: 'Android - Chrome',
      autoApprove: true,
    })

    expect(result.currentDeviceApproved).toBe(true)
    expect(result.blockedReason).toBe(null)
    expect(result.approvedCount).toBe(2)
    expect(result.replacementCooldownUntil).toBe(null)
    expect(supabase.calls.upsert).toHaveLength(1)
    expect(supabase.calls.upsert[0].payload).toMatchObject({
      user_id: 'user-1',
      device_id: 'js-phone',
      approved_at: '2026-05-22T12:00:00.000Z',
      revoked_at: null,
    })
  })

  it('keeps a revoked device blocked during the active replacement cooldown', async () => {
    const rows = [
      {
        id: 'device-current',
        device_id: 'js-phone',
        device_name: 'Android - Chrome',
        device_label: '',
        approved_at: '2026-05-21T08:00:00.000Z',
        revoked_at: '2026-05-22T10:00:00.000Z',
        last_seen_at: '2026-05-22T10:00:00.000Z',
        created_at: '2026-05-21T08:00:00.000Z',
      },
      {
        id: 'device-other',
        device_id: 'js-laptop',
        device_name: 'Windows - Chrome',
        device_label: '',
        approved_at: '2026-05-21T09:00:00.000Z',
        revoked_at: null,
        last_seen_at: '2026-05-22T10:30:00.000Z',
        created_at: '2026-05-21T09:00:00.000Z',
      },
    ]

    const supabase = createDeviceSupabaseMock({
      rows,
      upsertedRow: null,
    })

    const result = await ensureSecureDeviceAccess({
      supabase,
      user: { id: 'user-1' },
      deviceId: 'js-phone',
      deviceName: 'Android - Chrome',
      autoApprove: true,
    })

    expect(result.currentDeviceApproved).toBe(false)
    expect(result.blockedReason).toBe('cooldown_active')
    expect(result.approvedCount).toBe(1)
    expect(result.replacementCooldownUntil).toBe('2026-05-22T18:00:00.000Z')
    expect(supabase.calls.upsert).toHaveLength(0)
  })
})
