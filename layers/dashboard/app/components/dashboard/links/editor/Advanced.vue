<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { Component } from 'vue'
import type { AnyFieldApi, CountryRedirect, LinkFormData } from '@/types'
import { today } from '@internationalized/date'
import { CalendarIcon, Plus, Trash2 } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = defineProps<{
  form: {
    Field: Component
    getFieldValue: (name: keyof LinkFormData) => LinkFormData[keyof LinkFormData]
  }
  validateOptionalUrl: (ctx: { value: string }) => string | undefined
  validateCountryRedirects: (ctx: { value: CountryRedirect[] | undefined }) => string | undefined
  isInvalid: (field: AnyFieldApi) => boolean
  getAriaInvalid: (field: AnyFieldApi) => string | undefined
  formatErrors: (errors: unknown[]) => string[]
  currentSlug: string
}>()

const datePickerOpen = ref(false)
const locale = useI18n().locale

function createCountryRedirect(): CountryRedirect {
  return {
    country: '',
    url: '',
  }
}

function updateCountryRedirect(field: AnyFieldApi, index: number, patch: Partial<CountryRedirect>) {
  const nextRules = [...((field.state.value as CountryRedirect[] | undefined) ?? [])]
  const currentRule = nextRules[index] ?? createCountryRedirect()

  nextRules[index] = {
    ...currentRule,
    ...patch,
  }

  field.handleChange(nextRules)
}

function addCountryRedirect(field: AnyFieldApi) {
  const nextRules = [...((field.state.value as CountryRedirect[] | undefined) ?? []), createCountryRedirect()]
  field.handleChange(nextRules)
}

function removeCountryRedirect(field: AnyFieldApi, index: number) {
  const nextRules = ((field.state.value as CountryRedirect[] | undefined) ?? []).filter((_, currentIndex) => currentIndex !== index)
  field.handleChange(nextRules)
}

function formatCountryPreview(country: string): string {
  const normalizedCountry = country.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(normalizedCountry))
    return ''

  return [getFlag(normalizedCountry), getRegionName(normalizedCountry, locale.value)].filter(Boolean).join(' ')
}

// Compute default open items based on existing values
const defaultOpenItems = computed(() => {
  const items: string[] = []
  if (props.form.getFieldValue('expiration')) {
    items.push('expiration')
  }
  if (props.form.getFieldValue('title') || props.form.getFieldValue('description') || props.form.getFieldValue('image')) {
    items.push('og')
  }
  if (props.form.getFieldValue('google') || props.form.getFieldValue('apple')) {
    items.push('device')
  }
  const countryRedirects = props.form.getFieldValue('countryRedirects')
  if (Array.isArray(countryRedirects) && countryRedirects.length > 0) {
    items.push('country')
  }
  if (props.form.getFieldValue('cloaking') || props.form.getFieldValue('redirectWithQuery') || props.form.getFieldValue('password') || props.form.getFieldValue('unsafe')) {
    items.push('link_settings')
  }
  return items
})
</script>

<template>
  <Accordion type="multiple" :default-value="defaultOpenItems" class="w-full">
    <AccordionItem value="expiration">
      <AccordionTrigger>{{ $t('links.form.expiration') }}</AccordionTrigger>
      <AccordionContent class="px-1">
        <props.form.Field v-slot="{ field }" name="expiration">
          <Field :data-invalid="isInvalid(field)">
            <Popover v-model:open="datePickerOpen">
              <PopoverTrigger as-child>
                <Button
                  :id="field.name"
                  variant="outline"
                  :class="cn(
                    'w-full justify-start text-left font-normal',
                    !field.state.value && 'text-muted-foreground',
                  )"
                >
                  <CalendarIcon class="mr-2 h-4 w-4" />
                  {{
                    field.state.value
                      ? field.state.value.toDate(getTimeZone()).toLocaleDateString()
                      : $t('links.form.pick_date')
                  }}
                </Button>
              </PopoverTrigger>
              <PopoverContent class="w-auto p-0" align="start">
                <Calendar
                  :model-value="field.state.value"
                  :default-placeholder="today(getTimeZone())"
                  layout="month-and-year"
                  initial-focus
                  @update:model-value="(v: DateValue | undefined) => {
                    field.handleChange(v)
                    datePickerOpen = false
                  }"
                />
              </PopoverContent>
            </Popover>
            <FieldError
              v-if="isInvalid(field)"
              :errors="formatErrors(field.state.meta.errors)"
            />
          </Field>
        </props.form.Field>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="og">
      <AccordionTrigger>{{ $t('links.form.og_settings') }}</AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field v-slot="{ field }" name="title">
            <Field>
              <FieldLabel :for="field.name">
                {{ $t('links.form.og_title') }}
              </FieldLabel>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :placeholder="$t('links.form.og_title_placeholder')"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
            </Field>
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="description">
            <Field>
              <FieldLabel :for="field.name">
                {{ $t('links.form.og_description') }}
              </FieldLabel>
              <Textarea
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :placeholder="$t('links.form.og_description_placeholder')"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLTextAreaElement).value)"
              />
            </Field>
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="image">
            <Field>
              <FieldLabel :for="field.name">
                {{ $t('links.form.og_image') }}
              </FieldLabel>
              <DashboardLinksEditorImageUploader
                :model-value="field.state.value"
                :slug="currentSlug"
                @update:model-value="field.handleChange($event || '')"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="link_settings">
      <AccordionTrigger>{{ $t('links.form.link_settings') }}</AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field v-slot="{ field }" name="redirectWithQuery">
            <Field>
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <FieldLabel :for="field.name">
                    {{ $t('links.form.redirect_with_query_label') }}
                  </FieldLabel>
                  <p class="text-xs text-muted-foreground">
                    {{ $t('links.form.redirect_with_query_description') }}
                  </p>
                </div>
                <Switch
                  :id="field.name"
                  :model-value="field.state.value"
                  @update:model-value="field.handleChange"
                />
              </div>
            </Field>
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="cloaking">
            <Field>
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <FieldLabel :for="field.name">
                    {{ $t('links.form.cloaking_label') }}
                  </FieldLabel>
                  <p class="text-xs text-muted-foreground">
                    {{ $t('links.form.cloaking_description') }}
                  </p>
                </div>
                <Switch
                  :id="field.name"
                  :model-value="field.state.value"
                  @update:model-value="field.handleChange"
                />
              </div>
            </Field>
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="unsafe">
            <Field>
              <div class="flex items-center justify-between">
                <div class="space-y-0.5">
                  <FieldLabel :for="field.name">
                    {{ $t('links.form.unsafe_label') }}
                  </FieldLabel>
                  <p class="text-xs text-muted-foreground">
                    {{ $t('links.form.unsafe_description') }}
                  </p>
                </div>
                <Switch
                  :id="field.name"
                  :model-value="field.state.value"
                  @update:model-value="field.handleChange"
                />
              </div>
            </Field>
          </props.form.Field>

          <props.form.Field v-slot="{ field }" name="password">
            <Field>
              <FieldLabel :for="field.name">
                {{ $t('links.form.password_label') }}
              </FieldLabel>
              <p class="text-xs text-muted-foreground">
                {{ $t('links.form.password_description') }}
              </p>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :placeholder="$t('links.form.password_placeholder')"
                autocomplete="off"
                class="mt-1.5"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="device">
      <AccordionTrigger>{{ $t('links.form.device_redirect') }}</AccordionTrigger>
      <AccordionContent class="px-1">
        <FieldGroup>
          <props.form.Field
            v-slot="{ field }"
            name="google"
            :validators="{ onBlur: validateOptionalUrl }"
          >
            <Field :data-invalid="isInvalid(field)">
              <FieldLabel :for="field.name">
                {{ $t('links.form.google_play') }}
              </FieldLabel>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :aria-invalid="getAriaInvalid(field)"
                placeholder="https://play.google.com/store/apps/…"
                autocomplete="off"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </props.form.Field>

          <props.form.Field
            v-slot="{ field }"
            name="apple"
            :validators="{ onBlur: validateOptionalUrl }"
          >
            <Field :data-invalid="isInvalid(field)">
              <FieldLabel :for="field.name">
                {{ $t('links.form.app_store') }}
              </FieldLabel>
              <Input
                :id="field.name"
                :name="field.name"
                :model-value="field.state.value"
                :aria-invalid="getAriaInvalid(field)"
                placeholder="https://apps.apple.com/app/…"
                autocomplete="off"
                @blur="field.handleBlur"
                @input="field.handleChange(($event.target as HTMLInputElement).value)"
              />
              <FieldError
                v-if="isInvalid(field)"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </Field>
          </props.form.Field>
        </FieldGroup>
      </AccordionContent>
    </AccordionItem>

    <AccordionItem value="country">
      <AccordionTrigger>{{ $t('links.form.country_redirect') }}</AccordionTrigger>
      <AccordionContent class="px-1">
        <props.form.Field
          v-slot="{ field }"
          name="countryRedirects"
          :validators="{ onChange: validateCountryRedirects }"
        >
          <Field>
            <div class="space-y-3">
              <div
                v-if="field.state.value.length"
                class="space-y-3"
              >
                <div
                  v-for="(rule, index) in field.state.value"
                  :key="`country-rule-${index}`"
                  class="rounded-md border bg-muted/20 p-3"
                >
                  <div
                    class="
                      grid gap-3
                      md:grid-cols-[104px_minmax(0,1fr)_auto] md:items-start
                    "
                  >
                    <div class="space-y-1.5">
                      <FieldLabel :for="`country-code-${index}`">
                        {{ $t('links.form.country_code') }}
                      </FieldLabel>
                      <Input
                        :id="`country-code-${index}`"
                        :model-value="rule.country"
                        maxlength="2"
                        placeholder="US"
                        autocomplete="off"
                        aria-label="Country code"
                        class="uppercase"
                        @blur="field.handleBlur"
                        @input="updateCountryRedirect(field, Number(index), { country: ($event.target as HTMLInputElement).value.toUpperCase() })"
                      />
                      <p
                        v-if="formatCountryPreview(rule.country)"
                        class="truncate text-xs text-muted-foreground"
                      >
                        {{ formatCountryPreview(rule.country) }}
                      </p>
                    </div>

                    <div class="space-y-1.5">
                      <FieldLabel :for="`country-url-${index}`">
                        {{ $t('links.form.country_redirect_url') }}
                      </FieldLabel>
                      <Input
                        :id="`country-url-${index}`"
                        :model-value="rule.url"
                        :aria-invalid="getAriaInvalid(field)"
                        placeholder="https://example.com/us"
                        autocomplete="off"
                        aria-label="Country redirect URL"
                        @blur="field.handleBlur"
                        @input="updateCountryRedirect(field, Number(index), { url: ($event.target as HTMLInputElement).value })"
                      />
                    </div>

                    <div
                      class="
                        flex justify-end
                        md:pt-7
                      "
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Remove country redirect rule"
                        @click="removeCountryRedirect(field, Number(index))"
                      >
                        <Trash2 class="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="
                  rounded-md border border-dashed px-3 py-4 text-sm
                  text-muted-foreground
                "
              >
                {{ $t('links.form.country_redirect_empty') }}
              </div>

              <div
                class="
                  flex flex-col gap-3
                  sm:flex-row sm:items-center sm:justify-between
                "
              >
                <p class="text-xs text-muted-foreground">
                  {{ $t('links.form.country_redirect_description') }}
                </p>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  class="shrink-0"
                  aria-label="Add country redirect rule"
                  @click="addCountryRedirect(field)"
                >
                  <Plus class="mr-2 h-4 w-4" />
                  {{ $t('links.form.country_redirect_add') }}
                </Button>
              </div>

              <FieldError
                v-if="field.state.meta.errors.length"
                :errors="formatErrors(field.state.meta.errors)"
              />
            </div>
          </Field>
        </props.form.Field>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
