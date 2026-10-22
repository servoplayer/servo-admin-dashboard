import { useSearchParams } from 'react-router-dom'
import { MonitorSmartphone, ReceiptText } from 'lucide-react'
import Transaction from '../Transaction/Transaction';
import Playlists from '../Playlists/Playlists';
import { PageHeader } from '../ui/Card'
import Tabs from '../ui/Tabs'

const TABS = [
  { value: 'transactions', label: 'Transactions', icon: ReceiptText },
  { value: 'devices', label: 'Devices', icon: MonitorSmartphone },
]

export default function Customers() {
  const [params, setParams] = useSearchParams()
  // Transactions stays the default view of /layout/customer, as before.
  const tab = params.get('tab') === 'devices' ? 'devices' : 'transactions'

  return (
    <>
      <PageHeader
        title="Customers"
        description={
          tab === 'devices'
            ? 'Every registered device. Activate, renew or stop subscriptions.'
            : 'Subscription payments recorded for customer devices.'
        }
      />
      <div className="mb-4">
        <Tabs label="Customer views" tabs={TABS} value={tab} onChange={(value) => setParams({ tab: value })} />
      </div>
      {tab === 'transactions' ? <Transaction /> : <Playlists />}
    </>
  )
}
