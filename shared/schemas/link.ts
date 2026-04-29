import { customAlphabet } from 'nanoid'
import { z } from 'zod'

const { slugRegex } = useAppConfig()

const slugDefaultLength = +useRuntimeConfig().public.slugDefaultLength
const countryCodeRegex = /^[A-Z]{2}$/i

export const nanoid = (length: number = slugDefaultLength) => customAlphabet('23456789abcdefghjkmnpqrstuvwxyz', length)

export const CountryRedirectSchema = z.object({
  country: z.string().trim().regex(countryCodeRegex, 'Country code must be 2 letters').transform(code => code.toUpperCase()),
  url: z.string().trim().url().max(2048),
})

export const CountryRedirectsSchema = z.array(CountryRedirectSchema)
  .superRefine((rules, ctx) => {
    const seen = new Map<string, number>()

    for (const [index, rule] of rules.entries()) {
      const duplicateIndex = seen.get(rule.country)

      if (duplicateIndex !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate country code',
          path: [index, 'country'],
        })
        continue
      }

      seen.set(rule.country, index)
    }
  })
  .transform(rules => rules.length > 0 ? rules : undefined)

export const LinkSchema = z.object({
  id: z.string().trim().max(26).default(nanoid(10)),
  url: z.string().trim().url().max(2048),
  slug: z.string().trim().max(2048).regex(new RegExp(slugRegex)).default(nanoid()),
  comment: z.string().trim().max(2048).optional(),
  createdAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  updatedAt: z.number().int().safe().default(() => Math.floor(Date.now() / 1000)),
  expiration: z.number().int().safe().refine(expiration => expiration > Math.floor(Date.now() / 1000), {
    message: 'expiration must be greater than current time',
    path: ['expiration'],
  }).optional(),
  title: z.string().trim().max(256).optional(),
  description: z.string().trim().max(2048).optional(),
  image: z.string().trim().max(128).optional(),
  apple: z.string().trim().url().max(2048).optional(),
  google: z.string().trim().url().max(2048).optional(),
  countryRedirects: CountryRedirectsSchema.optional(),
  cloaking: z.boolean().optional(),
  redirectWithQuery: z.boolean().optional(),
  password: z.string().trim().min(1).max(128).optional(),
  unsafe: z.boolean().optional(),
})

export type CountryRedirect = z.infer<typeof CountryRedirectSchema>
export type Link = z.infer<typeof LinkSchema>

export interface ExportData {
  version: string
  exportedAt: string
  count: number
  links: Link[]
  cursor?: string
  list_complete: boolean
}
