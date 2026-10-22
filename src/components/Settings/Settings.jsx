import { useSearchParams } from 'react-router-dom'
import { Link2, UserCog } from 'lucide-react'
import LoginDetails from '../LoginDetails/LoginDetails';
import DemoUrl from '../DemoUrl/DemoUrl';
import { PageHeader } from '../ui/Card'
import Tabs from '../ui/Tabs'

const TABS = [
  { value: 'profile', label: 'Login details', icon: UserCog },
  { value: 'demo', label: 'Demo M3U URL', icon: Link2 },
]

export default function Settings() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'demo' ? 'demo' : 'profile'

  return (
    <>
      <PageHeader title="Settings" description="Your admin account and app-wide defaults." />
      <div className="mb-4">
        <Tabs label="Settings sections" tabs={TABS} value={tab} onChange={(value) => setParams({ tab: value })} />
      </div>
      <div className="max-w-2xl">{tab === 'profile' ? <LoginDetails /> : <DemoUrl />}</div>
    </>
  )
}
