document.addEventListener('DOMContentLoaded', () => {
  // 改折扣金額時同步更新訊息文字（尚未儲存前的預覽）
  const select = document.getElementById('discount')
  const msg = document.getElementById('msg-discount')
  if (select && msg) {
    select.addEventListener('change', () => {
      msg.value = msg.value.replace(/可抵用\d+元租金/, `可抵用${select.value}元租金`)
    })
  }

  // 折扣金額選「自訂」時顯示整數輸入框
  if (select && select.dataset.customInput) {
    const custom = document.getElementById(select.dataset.customInput)
    const sync = () => {
      const on = select.value === 'custom'
      custom.hidden = !on
      custom.required = on
      if (on) custom.focus()
      else custom.value = ''
    }
    select.addEventListener('change', sync)
    sync()
  }

  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const el = document.getElementById(btn.dataset.copy)
      if (!el) return
      try {
        await navigator.clipboard.writeText(el.value)
      } catch {
        el.select()
        document.execCommand('copy')
      }
      const original = btn.textContent
      btn.textContent = '已複製'
      setTimeout(() => (btn.textContent = original), 1500)
    })
  })

  // 儲存按鈕：表單內容與載入時相同就停用
  document.querySelectorAll('form[data-dirty-track]').forEach((form) => {
    const save = form.querySelector('[data-save]')
    const hint = form.querySelector('[data-save-hint]')
    if (!save) return
    const snapshot = () => new URLSearchParams(new FormData(form)).toString()
    const initial = snapshot()
    const refresh = () => {
      const dirty = snapshot() !== initial
      save.disabled = !dirty
      if (hint) hint.hidden = dirty
    }
    form.addEventListener('input', refresh)
    form.addEventListener('change', refresh)
    form.addEventListener('reset', () => setTimeout(refresh))
    refresh()
  })

  // 兩段式確認，不用瀏覽器原生 confirm()（部分環境會直接壓掉對話框）
  document.querySelectorAll('form[data-confirm]').forEach((form) => {
    const submit = form.querySelector('button[type="submit"]')
    const cancel = form.querySelector('button.cancel')
    const hint = form.querySelector('.hint')
    const original = submit.textContent
    let armed = false
    let timer = null

    const disarm = () => {
      armed = false
      clearTimeout(timer)
      submit.textContent = original
      form.classList.remove('armed')
      if (cancel) cancel.hidden = true
      if (hint) hint.hidden = true
    }

    form.addEventListener('submit', (e) => {
      if (armed) return // 第二次按下，真的送出
      e.preventDefault()
      armed = true
      submit.textContent = form.dataset.confirm
      form.classList.add('armed')
      if (cancel) cancel.hidden = false
      if (hint) hint.hidden = false
      timer = setTimeout(disarm, 8000) // 8 秒內沒按就自動取消
    })
    if (cancel) cancel.addEventListener('click', disarm)
  })
})
