import { redirect } from 'next/navigation'

export default function HealthHubLanding() {
  // Server-side redirect - client-side will handle auth check
  redirect('/healthhub/login')
}
