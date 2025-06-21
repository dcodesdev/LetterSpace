# Todos

- [x] I want the transform code and the other authorize code for the webhooks to accept the variables as arguments so that users can see and know which variables are available to them.

## For later

Anything in this list, do not touch them or do them.

- [ ] Use bun for workflow yaml to build the docker image, we need bun and typescript to generate the tag names.
- [ ] Update the docs to add receiving webhook setup guide.
- [ ] Bug: message preview on the campaign page only (works fine on messages page), when opened it closes/opens forever. re-render loop happens.
- [ ] Add unsubscribe status to message schema.
- [ ] Add unsubscribe status event to webhooks.

## Bugs

- [x] When updating a webhook, the form resets to previous state and the new values don't show in the UI and the button changes from "Update" to "Create" (works in the backend). To solve this, create a component and name it WebhookForm and re-use it in both create webhook dialog and edit webhook dialog. and for each row item you should render a different from and dialog and make sure you set the `key` for the React components so that each row will have a different form and dialog.
