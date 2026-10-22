import { useSearchParams } from 'react-router-dom'
import { HelpCircle, ScrollText, ShieldCheck } from 'lucide-react'
import Faqs from '../Faqs/Faqs';
import TermsCondition from '../TermsCondition/TermsCondition';
import PrivacyPolicy from '../PrivacyPolicy/PrivacyPolicy';
import { PageHeader } from '../ui/Card'
import Tabs from '../ui/Tabs'

const TABS = [
  { value: 'faqs', label: 'FAQs', icon: HelpCircle },
  { value: 'terms', label: 'Terms & conditions', icon: ScrollText },
  { value: 'privacy', label: 'Privacy policy', icon: ShieldCheck },
]

export default function EditContent() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.some((t) => t.value === params.get('tab')) ? params.get('tab') : 'faqs'

  return (
    <>
      <PageHeader title="App content" description="Help and legal content customers see on the Servo website." />
      <div className="mb-4">
        <Tabs label="Content sections" tabs={TABS} value={tab} onChange={(value) => setParams({ tab: value })} />
      </div>
      {tab === 'faqs' && <Faqs />}
      {tab === 'terms' && <TermsCondition />}
      {tab === 'privacy' && <PrivacyPolicy />}
    </>
  )
}
