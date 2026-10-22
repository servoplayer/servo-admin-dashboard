import { useNavigate } from 'react-router-dom'
import { Users } from 'lucide-react'
import { Card, PageHeader } from '../ui/Card'
import Button from '../ui/Button'
import { EmptyState } from '../ui/States'

// This route existed as an unfinished stub (it crashed on render). It is kept
// reachable by URL but has no backend endpoint yet, so it shows an honest state.
export default function ProviderCustomer() {
  const navigate = useNavigate()
  return (
    <>
      <PageHeader title="Provider customers" />
      <Card className="py-12">
        <EmptyState
          icon={Users}
          title="Not available yet"
          description="Provider customer management doesn't have a backend endpoint yet. Customer devices are managed under Customers."
          action={<Button variant="secondary" onClick={() => navigate('/layout/customer?tab=devices')}>Go to devices</Button>}
        />
      </Card>
    </>
  )
}
