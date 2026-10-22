import { ShieldCheck } from 'lucide-react'
import RichPageEditor from '../EditContent/RichPageEditor'

export default function PrivacyPolicy() {
  return (
    <RichPageEditor
      page="Privacy_Policy"
      title="Privacy policy"
      description="Shown to customers on the Servo website."
      icon={ShieldCheck}
    />
  )
}
