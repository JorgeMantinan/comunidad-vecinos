import { canManageRole } from '@comunidad/shared';
import type { Member } from '@comunidad/shared';
import { Button, Card, ErrorAlert, RoleBadge, Spinner } from '../../components/ui';
import { useChangeMemberRole, useMembers, useRemoveMember } from '../../lib/api';
import { useSession } from '../../lib/auth';

export function MembersCard({ communityId }: { communityId: string }) {
  const { data: session } = useSession();
  const members = useMembers(communityId);
  const changeRole = useChangeMemberRole(communityId);
  const removeMember = useRemoveMember(communityId);
  const myRole = members.data?.find((m) => m.userId === session?.user.id)?.role;

  if (members.error) {
    return <ErrorAlert message={members.error.message} />;
  }

  return (
    <Card title="Miembros">
      {members.isLoading ? <Spinner /> : null}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-accent-soft text-left text-neutral-500">
            <th className="py-2">Nombre</th>
            <th className="py-2">Email</th>
            <th className="py-2">Rol</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {members.data?.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              canManage={
                myRole !== undefined &&
                canManageRole(myRole, member.role) &&
                member.userId !== session?.user.id
              }
              onChangeRole={(role) => changeRole.mutate({ memberId: member.id, role })}
              onRemove={() => removeMember.mutate(member.id)}
            />
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function MemberRow({
  member,
  canManage,
  onChangeRole,
  onRemove,
}: {
  member: Member;
  canManage: boolean;
  onChangeRole: (role: string) => void;
  onRemove: () => void;
}) {
  return (
    <tr className="border-b border-accent-soft/60">
      <td className="py-2 font-medium text-neutral-800">{member.name}</td>
      <td className="py-2 text-neutral-600">{member.email}</td>
      <td className="py-2">
        {canManage ? (
          <select
            value={member.role}
            onChange={(event) => onChangeRole(event.target.value)}
            className="rounded-lg border border-accent bg-white px-2 py-1 text-sm"
            aria-label={`Rol de ${member.name}`}
          >
            <option value="owner">Presidente</option>
            <option value="admin">Administración</option>
            <option value="member">Propietario</option>
            <option value="resident">Residente</option>
          </select>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </td>
      <td className="py-2 text-right">
        {canManage ? (
          <Button variant="danger" onClick={onRemove}>
            Eliminar
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
