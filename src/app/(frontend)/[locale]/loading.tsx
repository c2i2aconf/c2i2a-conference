import { Skeleton } from '@/components/ui/skeleton'

/** Shell shown while per-request pages (submission, account, auth) resolve. */
export default function Loading() {
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-6 py-24">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <Skeleton className="mt-6 h-11 w-40 rounded-full" />
    </div>
  )
}
