import { Head } from '@inertiajs/react'
import { useQuery } from '@tanstack/react-query'

export default function Home() {
  const { data } = useQuery({
    queryKey: ['notifications', 'notifiable', 1],
    queryFn: async () => {
      const result = await fetch('/notifications/notifiable/1/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      return await result.json()
    },
  })

  return (
    <>
      <Head title="Homepage" />

      <h1 className="text-3xl font-bold underline">Hello world!</h1>

      <h2 className="text-2xl font-semibold mt-4">Notifications</h2>
      <ul className="list-disc pl-5">
        {data?.map((notification: any) => (
          <li key={notification.id} className="mt-2">
            {JSON.stringify(notification, null, 2)}
          </li>
        ))}
      </ul>
    </>
  )
}
