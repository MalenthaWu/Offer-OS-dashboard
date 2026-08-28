export class CommittedMutationError extends Error {
  constructor(operation, cause) {
    super(`${operation}已保存，但界面刷新失败`);
    this.name = 'CommittedMutationError';
    this.committed = true;
    this.operation = operation;
    this.cause = cause;
  }
}

export function isCommittedMutationError(error) {
  return error instanceof CommittedMutationError || error?.committed === true;
}

export async function reloadAfterCommittedMutation(reload, operation) {
  try {
    await reload();
  } catch (error) {
    throw new CommittedMutationError(operation, error);
  }
}
