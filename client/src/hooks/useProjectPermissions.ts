import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '../api/endpoints';
import type { PermissionAction, PermissionModule } from '../types';

/**
 * The signed-in user's permissions on one project. Used only to hide controls: the server applies the same
 * matrix to every request and refuses anything outside it.
 */
export function useProjectPermissions(projectId?: string) {
  const { data } = useQuery({
    queryKey: ['project-permissions', projectId],
    queryFn: () => projectsApi.permissions(projectId!).then(r => r.data),
    enabled: !!projectId,
    staleTime: 60_000,
  });
  const can = (module: PermissionModule, action: PermissionAction) => !!data?.permissions?.[module]?.includes(action);
  return { data, loaded: !!data, can, role: data?.role, seesInternal: !!data?.seesInternal };
}
