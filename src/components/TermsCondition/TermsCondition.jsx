import { ScrollText } from 'lucide-react'
import RichPageEditor from '../EditContent/RichPageEditor'

export default function TermsCondition() {
  return (
    <RichPageEditor
      page="Terms_Conditions"
      title="Terms & conditions"
      description="Shown to customers on the Servo website."
      icon={ScrollText}
    />
  )
}
