module.exports = {
  async getVersionMessage(releasePlan, _options) {
    const releases = releasePlan.releases.filter((release) => release.type !== 'none')

    const lines = releases.map((release) => `- ${release.name}@${release.newVersion}`)

    return `chore: release\n\n${lines.join('\n')}`
  },
}
