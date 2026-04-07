<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import {
  Monitor,
  BrushFilled,
  ChatLineRound,
  Guide,
  EditPen,
    CircleCheck,
    Connection,
    Files,
} from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';
import PageHeader from '@/components/PageHeader.vue';
import PageContent from '@/components/PageContent.vue';

const { t } = useI18n();
const router = useRouter();

const cards = [
  {
    key: 'layout',
    icon: Monitor,
  },
  {
    key: 'theme',
    icon: BrushFilled,
  },
  {
    key: 'i18n',
    icon: ChatLineRound,
  },
];

// 临时逻辑：始终认为当前无纳管设备，方便预览引导页
const hasManagedDevices = computed(() => false);

function handleGuideEntryClick() {
  // TODO: 后续在此处接入「使用指南」切换逻辑
}

function goToDeviceManagement() {
  void router.push('/device-management');
}

function goToComplianceConfig() {
  void router.push('/analysis/config');
}

function goToPolicyLedger() {
  void router.push('/policy-ledger');
}

function goToPolicyAnalysis() {
  void router.push('/policy-analysis');
}

function goToPolicyChange() {
  void router.push('/policy-change');
}

function goToBackupManagement() {
  void router.push('/reports');
}
</script>

<template>
  <section class="home">
    <PageHeader :title="t('home.title')" :subtitle="t('home.subtitle')" variant="simple">
      <template #actions>
        <ElButton size="small" plain @click="handleGuideEntryClick">使用指南</ElButton>
      </template>
    </PageHeader>

    <PageContent>
      <template v-if="hasManagedDevices">
        <ElRow :gutter="16" class="home__cards">
          <ElCol v-for="card in cards" :key="card.key" :xs="24" :sm="12" :md="8">
            <ElCard shadow="hover" class="home__card">
              <div class="home__card-icon">
                <ElIcon><component :is="card.icon" /></ElIcon>
              </div>
              <h3 class="home__card-title">{{ t(`home.cards.${card.key}.title`) }}</h3>
              <p class="home__card-content">{{ t(`home.cards.${card.key}.description`) }}</p>
            </ElCard>
          </ElCol>
        </ElRow>
      </template>

      <template v-else>
        <section class="fw-guide" aria-label="防火墙管理引导">
          <header class="fw-guide__header">
            <div class="fw-guide__badge">
              <ElIcon><Guide /></ElIcon>
            </div>
            <div class="fw-guide__titles">
              <h2 class="fw-guide__title">策略分析系统使用引导</h2>
              <p class="fw-guide__subtitle">
                按照 4 个步骤完成防火墙纳管、配置采集与合规分析，开启策略分析、变更与备份等功能。
              </p>
            </div>
          </header>

          <ElRow :gutter="16" class="fw-guide__steps">
            <ElCol :xs="24" :md="12">
              <ElCard class="fw-guide__card" shadow="hover">
                <div class="fw-guide__card-header">
                  <div class="fw-guide__step-index">01</div>
                  <div class="fw-guide__card-meta">
                    <h3 class="fw-guide__card-title">纳管防火墙设备</h3>
                    <p class="fw-guide__card-subtitle">在配置中心完成防火墙网关设备纳管。</p>
                  </div>
                </div>
                <ul class="fw-guide__list">
                  <li>前往「配置中心 / 设备管理」页面，点击【添加】纳管防火墙网关设备。</li>
                  <li>未纳管任何设备时，后续策略、分析、备份等页面都会为空。</li>
                </ul>
                <div class="fw-guide__actions">
                  <ElButton type="primary" size="small" @click="goToDeviceManagement">
                    去纳管防火墙
                  </ElButton>
                </div>
              </ElCard>
            </ElCol>

            <ElCol :xs="24" :md="12">
              <ElCard class="fw-guide__card" shadow="hover">
                <div class="fw-guide__card-header">
                  <div class="fw-guide__step-index">02</div>
                  <div class="fw-guide__card-meta">
                    <h3 class="fw-guide__card-title">完成第一次采集 / 配置导入</h3>
                    <p class="fw-guide__card-subtitle">确保系统中存在可用的设备配置文件。</p>
                  </div>
                </div>
                <ul class="fw-guide__list">
                  <li>配置导入方式：手动上传防火墙配置文件。</li>
                  <li>直连 / SFTP 转发 / API 获取等方式：需先完成一次采集后才能生成配置文件。</li>
                  <li>未上传配置或未采集成功时，各类分析与报表页面将无数据可用。</li>
                </ul>
                <div class="fw-guide__actions">
                  <ElButton type="primary" plain size="small" @click="goToDeviceManagement">
                    去配置采集 / 上传配置
                  </ElButton>
                </div>
              </ElCard>
            </ElCol>

            <ElCol :xs="24" :md="12">
              <ElCard class="fw-guide__card" shadow="hover">
                <div class="fw-guide__card-header">
                  <div class="fw-guide__step-index">03</div>
                  <div class="fw-guide__card-meta">
                    <h3 class="fw-guide__card-title">完成合规配置并进行合规分析</h3>
                    <p class="fw-guide__card-subtitle">对每次采集的设备配置进行合规检查。</p>
                  </div>
                </div>
                <ul class="fw-guide__list">
                  <li>在合规分析页面进入各合规配置项，完成合规检查基础配置，如合规矩阵、高危端口等规则。</li>
                  <li>配置完成后，系统默认对每次上传 / 采集到的防火墙配置执行合规分析。</li>
                  <li>在合规分析结果报告中快速发现不合规策略，支持按等保等标准整改。</li>
                </ul>
                <div class="fw-guide__actions">
                  <ElButton type="primary" size="small" @click="goToComplianceConfig">
                    去完成合规配置
                  </ElButton>
                </div>
              </ElCard>
            </ElCol>

            <ElCol :xs="24" :md="12">
              <ElCard class="fw-guide__card" shadow="hover">
                <div class="fw-guide__card-header">
                  <div class="fw-guide__step-index">04</div>
                  <div class="fw-guide__card-meta">
                    <h3 class="fw-guide__card-title">使用各项功能</h3>
                    <p class="fw-guide__card-subtitle">在策略分析、变更与备份模块中持续运营防火墙。</p>
                  </div>
                </div>
                <div class="fw-guide__feature-grid">
                  <div class="fw-guide__feature">
                    <div class="fw-guide__feature-icon fw-guide__feature-icon--primary">
                      <ElIcon><Connection /></ElIcon>
                    </div>
                    <div class="fw-guide__feature-body">
                      <div class="fw-guide__feature-title">策略分析 / 策略台账</div>
                      <p class="fw-guide__feature-desc">
                        采集完成后，可优先查看策略合规分析，也可在「策略台账」中查看安全策略、NAT
                        策略、ACL 等基础信息。
                      </p>
                      <div class="fw-guide__feature-actions">
                        <ElButton size="small" text @click="goToPolicyAnalysis">
                          查看安全策略
                        </ElButton>
                        <ElButton size="small" text @click="goToPolicyLedger">
                          策略命中分析
                        </ElButton>
                      </div>
                    </div>
                  </div>

                  <div class="fw-guide__feature">
                    <div class="fw-guide__feature-icon">
                      <ElIcon><EditPen /></ElIcon>
                    </div>
                    <div class="fw-guide__feature-body">
                      <div class="fw-guide__feature-title">策略增删改（策略变更）</div>
                      <p class="fw-guide__feature-desc">
                        若需开通 / 修改 / 回收策略，或进行网络路径分析，可在「策略变更」相关页面发起并跟踪变更。
                      </p>
                      <div class="fw-guide__feature-actions">
                        <ElButton size="small" text @click="goToPolicyChange">
                          前往策略变更
                        </ElButton>
                      </div>
                    </div>
                  </div>

                  <div class="fw-guide__feature">
                    <div class="fw-guide__feature-icon">
                      <ElIcon><Files /></ElIcon>
                    </div>
                    <div class="fw-guide__feature-body">
                      <div class="fw-guide__feature-title">设备备份 / 历史配置</div>
                      <p class="fw-guide__feature-desc">
                        在「备份管理」功能中查看与下载设备历史备份记录，用于审计、回滚与配置对比。
                      </p>
                      <div class="fw-guide__feature-actions">
                        <ElButton size="small" text @click="goToBackupManagement">
                          查看备份记录
                        </ElButton>
                      </div>
                    </div>
                  </div>
                </div>
              </ElCard>
            </ElCol>
          </ElRow>

          <footer class="fw-guide__footer">
            <ElAlert
              type="info"
              :closable="false"
              show-icon
              class="fw-guide__hint"
              :icon="CircleCheck"
              title="完成以上步骤后，可任意时间通过顶部「使用指南」入口再次回到本引导。"
            />
          </footer>
        </section>
      </template>
    </PageContent>
  </section>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.home__cards {
  margin-bottom: 16px;
}

.home__card {
  border-radius: 16px;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  height: 100%;
}

.home__card-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background-color: rgba(var(--primary-color-rgb), 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.home__card-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.home__card-content {
  margin: 12px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.fw-guide {
  margin-top: 8px;
  padding: 20px 20px 16px;
  border-radius: 16px;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.fw-guide__header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 4px;
}

.fw-guide__badge {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--primary-color-rgb), 0.12);
  color: var(--primary-color);
}

.fw-guide__titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fw-guide__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--color-text);
}

.fw-guide__subtitle {
  margin: 0;
  font-size: 14px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.fw-guide__steps {
  margin-top: 4px;
}

.fw-guide__steps > .el-col:nth-child(n + 3) {
  margin-top: 12px;
}

.fw-guide__card {
  border-radius: 14px;
  border: 1px solid var(--color-border);
  background-color: var(--color-surface);
  height: 100%;
}

.fw-guide__card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.fw-guide__step-index {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(var(--primary-color-rgb), 0.1);
  color: var(--primary-color);
  font-size: 14px;
  font-weight: 600;
}

.fw-guide__card-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.fw-guide__card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.fw-guide__card-subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}

.fw-guide__list {
  margin: 0 0 12px;
  padding-left: 18px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.fw-guide__list li + li {
  margin-top: 4px;
}

.fw-guide__actions {
  display: flex;
  justify-content: flex-start;
  margin-top: 4px;
}

.fw-guide__feature-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 4px;
}

.fw-guide__feature {
  display: flex;
  gap: 10px;
}

.fw-guide__feature-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background-soft);
  color: var(--color-text);
}

.fw-guide__feature-icon--primary {
  background-color: rgba(var(--primary-color-rgb), 0.12);
  color: var(--primary-color);
}

.fw-guide__feature-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.fw-guide__feature-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

.fw-guide__feature-desc {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}

.fw-guide__feature-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}

.fw-guide__footer {
  margin-top: 4px;
}

.fw-guide__hint {
  border-radius: 12px;
}

@media (max-width: 960px) {
  .fw-guide {
    padding: 16px 12px 12px;
  }
}
</style>
