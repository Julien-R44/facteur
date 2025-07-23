import { fileURLToPath } from 'node:url'

interface DuplicateNotification {
  notificationName: string
  notifications: Array<{ notification: any; file: URL | string }> | undefined
}

export class DuplicateNotificationException extends Error {
  constructor(appRoot: URL, duplicates: DuplicateNotification[]) {
    let errorMessage = 'Duplicate notification names detected:'

    for (const { notificationName, notifications = [] } of duplicates) {
      errorMessage += `\n\nNotification name "${notificationName}" is used in multiple files:\n`
      errorMessage += notifications
        .map(({ file }) => {
          const relativePath = fileURLToPath(file).replace(appRoot.pathname, '')
          return `- ${relativePath}`
        })
        .join('\n')
    }

    errorMessage +=
      '\n\nEach notification must have a unique name. You can use a static "notificationName" property to customize the notification name.'

    super(errorMessage)
    this.name = 'DuplicateNotificationException'
  }
}
