// Delivery acknowledgements never establish whether a design edit was applied.
// Only the agent reports progress, after native inspection and guarded persistence.
export class SelectionEdits {
  constructor() { this.requests = new Map(); this.latest = null; }
  prepare(prepared) {
    const record = { requestId: prepared.requestId, status: 'prepared', version: prepared.version,
      recoveryPath: prepared.recoveryPath };
    this.requests.set(record.requestId, record);
    this.latest = record;
    if (this.requests.size > 100) this.requests.delete(this.requests.keys().next().value);
  }
  current() {
    if (!this.latest) return null;
    const { requestId, status, detail } = this.latest;
    return { requestId, status, ...(detail ? { detail } : {}) };
  }
  async report({ requestId, status, detail }, session) {
    const record = this.requests.get(requestId);
    if (!record || record.recoveryPath !== session.draft) throw new Error('Unknown selection edit request for this canvas.');
    if (!['working', 'completed', 'failed'].includes(status)) throw new Error('Use working, completed or failed.');
    if (typeof detail !== 'string' || !detail.trim() || detail.length > 500) throw new Error('Provide a brief progress or verification summary (1–500 characters).');
    if (['completed', 'failed'].includes(record.status)) {
      if (record.status !== status) throw new Error('This selection edit is already finished.');
      return { requestId, status: record.status, detail: record.detail };
    }
    if (status === 'completed') {
      if (record.status !== 'working') throw new Error('Report working before completing the edit.');
      const live = await session.document();
      if (live.version <= record.version) throw new Error('No document change has been observed for this request.');
      if (!session.lastSave || session.lastSave.version !== live.version) throw new Error('Save the current canvas with canvas_save before reporting completion.');
    }
    record.status = status; record.detail = detail.trim();
    return { requestId, status, detail: record.detail };
  }
}
