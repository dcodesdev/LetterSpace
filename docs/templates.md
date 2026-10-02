# Templates

A template is an HTML wrapper. Campaign content is injected into it at send time.

## The `{{content}}` marker

Template content must contain `{{content}}`; `template.create` and `template.update` reject it otherwise. At send time every occurrence is replaced with the campaign's content:

```html
<html>
  <body style="font-family: sans-serif">
    <h1>My Newsletter</h1>
    {{content}}
    <footer><a href="{{unsubscribe_link}}">Unsubscribe</a></footer>
  </body>
</html>
```

Templates are ordinary HTML, so any placeholder from [placeholders.md](placeholders.md) works in them too.

## Manage templates

| Procedure | Input |
| --- | --- |
| `template.create` | `{ name, description?, content, organizationId }` |
| `template.update` | Same, plus `id` |
| `template.delete` | `{ id, organizationId }` |
| `template.list` | `{ organizationId, page, perPage, search? }` |
| `template.get` | `{ id, organizationId }` |

Deleting a template sets `templateId` to null on campaigns that used it (`onDelete: SetNull`); those campaigns then send their raw content.

## Default template

Creating an organization seeds one template named `Newsletter` from `apps/backend/templates/newsletter.html`.

## Attach to a campaign

Set `templateId` on `campaign.update`. A campaign with no template sends its content as-is. The campaign editor's preview renders the template with the content substituted in.
