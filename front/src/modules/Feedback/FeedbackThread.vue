<template>
  <div class="feedback-stack">
    <div class="feedback-card feedback-stack">
      <div class="feedback-actions">
        <span class="feedback-status">{{ entry.status }}</span
        ><span class="feedback-muted">{{ entry.category }} · {{ new Date(entry.createdAt).toLocaleString() }}</span>
      </div>
      <p v-if="entry.rating" class="feedback-muted">Experience rating: {{ entry.rating }} / 5</p>
      <p class="feedback-text">{{ entry.message }}</p>
    </div>
    <h3>Admin replies ({{ entry.replies.length }})</h3>
    <p v-if="!entry.replies.length" class="feedback-muted">No reply yet. Your feedback has been received.</p>
    <article v-for="reply in entry.replies" :key="reply.id" class="feedback-card feedback-reply feedback-stack">
      <div class="feedback-actions">
        <strong>{{ reply.admin.name }} · Admin</strong
        ><time class="feedback-muted">{{ new Date(reply.createdAt).toLocaleString() }}</time>
      </div>
      <p class="feedback-text">{{ reply.message }}</p>
    </article>
  </div>
</template>
<script setup lang="ts">
import type { FeedbackDetail } from './api';
defineProps<{ entry: FeedbackDetail }>();
</script>
