# Todos

- [x] I want the transform code and the other authorize code for the webhooks to accept the variables as arguments so that users can see and know which variables are available to them.

## Bugs

- [x] When updating a webhook, the form resets to previous state and the new values don't show in the UI and the button changes from "Update" to "Create" (works in the backend). To solve this, create a component and name it WebhookForm and re-use it in both create webhook dialog and edit webhook dialog. and for each row item you should render a different from and dialog and make sure you set the `key` for the React components so that each row will have a different form and dialog.
