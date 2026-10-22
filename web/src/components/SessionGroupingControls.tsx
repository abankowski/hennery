import { useSessionScope } from './SessionScope'
export default function SessionGroupingControls() {
  const scope = useSessionScope()
  if (!scope) return null
  return <div className="grouping-controls">
    <fieldset className="group-choice"><legend>Group</legend>{(['hat', 'host'] as const).map(value => <label key={value}><input type="radio" name="group" value={value} checked={scope.group === value} onChange={() => scope.setGroup(value)} />{value === 'hat' ? 'Hat' : 'Host'}</label>)}</fieldset>
    <fieldset className="group-choice"><legend>then</legend>{(['project', 'none'] as const).map(value => <label key={value}><input type="radio" name="subgroup" value={value} checked={scope.subgroup === value} onChange={() => scope.setSubgroup(value)} />{value === 'project' ? 'Project' : 'Nothing'}</label>)}</fieldset>
  </div>
}
