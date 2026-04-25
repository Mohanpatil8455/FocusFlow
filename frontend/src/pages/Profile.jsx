export default function Profile({ user }) {
  return (
    <section className="ff-panel" style={{ maxWidth: 460 }}>
      <div className="ff-panelHeader">
        <div>
          <div className="ff-panelTitle">Profile</div>
          <div className="ff-panelHint">Account details</div>
        </div>
      </div>

      <div className="ff-profileCard">
        <div className="ff-profileAvatar">{(user?.name || user?.email || 'U').charAt(0).toUpperCase()}</div>
        <div>
          <div className="ff-panelTitle">{user?.name || 'User'}</div>
          <div className="ff-muted">{user?.email || '-'}</div>
        </div>
      </div>
    </section>
  )
}

