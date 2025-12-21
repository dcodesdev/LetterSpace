import { WEBHOOK_EVENTS } from "@repo/shared"

export function WebhookEventsReference() {
  return (
    <div className="my-6 overflow-hidden rounded-lg border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50 dark:bg-gray-800">
            <th className="px-4 py-3 text-left text-sm font-medium">
              Event Type
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">Aliases</th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Message Status
            </th>
            <th className="px-4 py-3 text-left text-sm font-medium">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {WEBHOOK_EVENTS.map((event, index) => (
            <tr
              key={event.name}
              className={
                index % 2 === 0
                  ? "bg-white dark:bg-gray-900"
                  : "bg-gray-50 dark:bg-gray-800"
              }
            >
              <td className="px-4 py-3 text-sm font-mono">{event.name}</td>
              <td className="px-4 py-3 text-sm">
                {event.aliases.map((alias, i) => (
                  <span key={alias}>
                    <code className="text-xs">{alias}</code>
                    {i < event.aliases.length - 1 && ", "}
                  </span>
                ))}
              </td>
              <td className="px-4 py-3 text-sm">
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs dark:bg-gray-700">
                  {event.status}
                </code>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                {event.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
